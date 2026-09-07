import { getSupabaseClient } from "@/lib/supabase";
import { householdLocalToInstant } from "@/lib/householdTime";
import { inferArrivalAt, type ArrivalBufferRule } from "@/lib/arrival";
import type { EntryKind, FamilyMember, SourceDetail } from "@/lib/types";
import type { MemberEmailDomain } from "@/lib/data/memberEmailDomains";
import type { ExtractedItem } from "./extract/extractEvents";
import {
  addDays,
  buildMergePatch,
  llmDisambiguate,
  triageCandidates,
  type ExistingEntry,
} from "./dedupe";

const DEDUPE_COLS =
  "id,kind,title,starts_at,ends_at,due_at,is_all_day,location_text,notes,category,subject_member_id,arrival_at,arrival_source,status,source_detail";

export interface MessageMeta {
  gmailMessageId: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: string | null;
  provider: "google" | "microsoft";
  accountEmail: string;
  connectionId: string;
}

/** Extracts the domain from a raw `From:` header value, e.g.
 * `"Austin Prep" <mail1@veracross.com>` → `veracross.com`. */
export function extractSenderDomain(sender: string): string | null {
  const match = sender.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

/** The sender's domain is a known school domain for a specific kid — used
 * when the LLM didn't name anyone (common for a school's automated mailer
 * addressed to parents generally). Resolved once per message, not per item,
 * since it only depends on the constant sender address. */
export function resolveByDomain(sender: string, emailDomains: MemberEmailDomain[]): string | null {
  const domain = extractSenderDomain(sender);
  if (!domain) return null;
  const rule = emailDomains.find((d) => domain === d.domain || domain.endsWith(`.${d.domain}`));
  return rule?.familyMemberId ?? null;
}

export function resolvePerson(
  hint: string | null,
  domainMemberId: string | null,
  familyMembers: FamilyMember[]
): string | null {
  if (hint) {
    // The LLM named someone — trust that over the domain guess. If the name
    // isn't a family member (e.g. a teacher or coach mentioned in the body),
    // leave it unassigned rather than silently falling back to the domain
    // rule, which would misattribute it to a specific kid.
    const byName = familyMembers.find((m) => m.name.toLowerCase() === hint.toLowerCase());
    return byName ? byName.id : null;
  }
  return domainMemberId;
}

function buildSourceDetail(item: ExtractedItem, meta: MessageMeta): SourceDetail {
  return {
    gmailMessageId: meta.gmailMessageId,
    threadId: meta.threadId,
    sender: meta.sender,
    subject: meta.subject,
    attachmentName: item.attachment_name ?? undefined,
    attachmentPage: item.attachment_page ?? undefined,
    extractedSnippet: item.source_excerpt,
    receivedAt: meta.receivedAt ?? undefined,
    provider: meta.provider,
    accountEmail: meta.accountEmail,
    connectionId: meta.connectionId,
  };
}

/** event / advisory / reminder land on the schedule (need a date); task
 * is deadline-style (date optional). */
const SCHEDULE_KINDS: EntryKind[] = ["event", "advisory", "reminder"];

const TITLE_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "at", "on", "in", "with",
  "your", "our", "day", "night", "party", "event", "bring", "wear",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !TITLE_STOPWORDS.has(t))
  );
}

/** A reminder rides along as a sub-line of ONE dated event from the same
 * email. Pick that parent: the sole event if there's exactly one, else the
 * best title-token overlap among this message's events (falling back to
 * tasks). No confident match with multiple candidates → leave it standalone
 * rather than nest it under the wrong entry. */
export function pickReminderParent(
  reminder: Pick<ExtractedItem, "title">,
  candidates: { id: string; title: string }[]
): string | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const wanted = titleTokens(reminder.title);
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    let score = 0;
    for (const tok of titleTokens(c.title)) if (wanted.has(tok)) score++;
    if (!best || score > best.score) best = { id: c.id, score };
  }
  return best && best.score > 0 ? best.id : null;
}

/** Existing non-dismissed entries within ±1 day of a new item that could be
 * the same real-world thing — the pool cross-email dedupe reasons over. */
async function fetchDuplicateCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  item: ExtractedItem,
  meta: MessageMeta
): Promise<ExistingEntry[]> {
  if (!item.date || item.kind === "reminder") return [];

  let query = supabase.from("entries").select(DEDUPE_COLS).neq("status", "dismissed");
  if (item.kind === "task") {
    query = query
      .eq("kind", "task")
      .gte("due_at", addDays(item.date, -1))
      .lte("due_at", addDays(item.date, 1));
  } else {
    // Generous UTC bounds around local days [date-1 .. date+1];
    // triageCandidates re-checks the exact household-local date.
    query = query
      .in("kind", ["event", "advisory"])
      .gte("starts_at", householdLocalToInstant(addDays(item.date, -1)))
      .lt("starts_at", householdLocalToInstant(addDays(item.date, 2)));
  }

  const { data, error } = await query.returns<ExistingEntry[]>();
  if (error) throw error;
  return (data ?? []).filter((e) => e.source_detail?.gmailMessageId !== meta.gmailMessageId);
}

export async function writeExtractedItems(
  items: ExtractedItem[],
  meta: MessageMeta,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[],
  arrivalRules: ArrivalBufferRule[]
): Promise<{ eventsCreated: number; todosCreated: number; merged: number }> {
  const supabase = getSupabaseClient();
  const domainMemberId = resolveByDomain(meta.sender, emailDomains);
  let eventsCreated = 0;
  let todosCreated = 0;
  let merged = 0;

  /** Inserts one extracted item; returns its new row id (null if skipped). */
  const insertItem = async (
    item: ExtractedItem,
    linkedEntryId: string | null
  ): Promise<string | null> => {
    const subjectId = resolvePerson(item.person_hint, domainMemberId, familyMembers);
    const subject = familyMembers.find((m) => m.id === subjectId);
    const sourceDetail = buildSourceDetail(item, meta);
    const kind = item.kind;

    // Advisories are a household concept, never pinned to one person.
    const subjectMemberId = kind === "advisory" ? null : subjectId;
    const onSchedule = SCHEDULE_KINDS.includes(kind);

    if (onSchedule && !item.date) return null; // no date → not useful on the calendar

    const startsAt = onSchedule && item.date ? householdLocalToInstant(item.date, item.time) : null;
    const endsAt =
      startsAt && item.end_time ? householdLocalToInstant(item.date!, item.end_time) : null;

    let arrivalAt: string | null = null;
    let arrivalSource: "stated" | "inferred" | null = null;
    // Only a timed event gets an arrival — an all-day entry (holiday, no-school,
    // spirit day) has no meaningful "arrive by", and inferring one against
    // local midnight produced nonsense like "arrive 11:45 PM the night before".
    if (kind === "event" && item.date && item.time) {
      if (item.arrival_time) {
        arrivalAt = householdLocalToInstant(item.date, item.arrival_time);
        arrivalSource = "stated";
      } else {
        const inferred = inferArrivalAt(
          {
            kind,
            startsAt,
            category: item.category,
            subjectMemberId,
            subjectIsAdult: subject?.isAdult ?? false,
          },
          arrivalRules
        );
        if (inferred) {
          arrivalAt = inferred;
          arrivalSource = "inferred";
        }
      }
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({
        kind,
        title: item.title,
        subject_member_id: subjectMemberId,
        category: item.category,
        starts_at: startsAt,
        ends_at: endsAt,
        due_at: kind === "task" ? item.date : null,
        is_all_day: onSchedule ? !item.time : false,
        location_text: kind === "task" ? null : item.location,
        notes: item.notes,
        arrival_at: arrivalAt,
        arrival_source: arrivalSource,
        linked_entry_id: kind === "reminder" ? linkedEntryId : null,
        busy_status: kind === "event" ? "busy" : "free",
        is_critical: item.is_critical ?? false,
        scope: subject?.isAdult ? "personal" : "family",
        status: "pending_review",
        source_type: "email_scan",
        source_detail: sourceDetail,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Default owner: the subject, for kid-subject (family-scoped) entries.
    if (data && subjectMemberId && !subject?.isAdult) {
      const { error: ownerErr } = await supabase
        .from("entry_owners")
        .insert({ entry_id: data.id, family_member_id: subjectMemberId });
      if (ownerErr) throw ownerErr;
    }

    if (kind === "task") todosCreated++;
    else eventsCreated++;
    return data?.id ?? null;
  };

  // Insert non-reminders first so a reminder can be linked to its sibling
  // event/task from the same email (write.ts previously never set
  // linked_entry_id, so every auto-detected reminder rendered standalone).
  const parents: { id: string; title: string; kind: EntryKind }[] = [];
  for (const item of items) {
    if (item.kind === "reminder") continue;

    // Cross-email dedupe: does an existing entry already represent this?
    const subjectId =
      item.kind === "advisory"
        ? null
        : resolvePerson(item.person_hint, domainMemberId, familyMembers);
    const candidates = await fetchDuplicateCandidates(supabase, item, meta);
    const { certain, maybes } = triageCandidates(item, candidates, subjectId);
    const dupe = certain ?? (maybes.length ? await llmDisambiguate(item, maybes) : null);

    if (dupe) {
      const { patch } = buildMergePatch(dupe, item, meta, subjectId);
      const { error } = await supabase.from("entries").update(patch).eq("id", dupe.id);
      if (error) throw error;
      merged++;
      // A sibling reminder from this same email can still attach to the survivor.
      parents.push({ id: dupe.id, title: dupe.title, kind: dupe.kind });
      continue;
    }

    const id = await insertItem(item, null);
    if (id) parents.push({ id, title: item.title, kind: item.kind });
  }

  const eventParents = parents.filter((p) => p.kind === "event");
  const parentPool = eventParents.length ? eventParents : parents.filter((p) => p.kind === "task");
  for (const item of items) {
    if (item.kind !== "reminder") continue;
    await insertItem(item, pickReminderParent(item, parentPool));
  }

  return { eventsCreated, todosCreated, merged };
}
