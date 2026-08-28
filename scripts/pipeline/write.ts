import { getSupabaseClient } from "@/lib/supabase";
import { householdLocalToInstant } from "@/lib/householdTime";
import { inferArrivalAt, type ArrivalBufferRule } from "@/lib/arrival";
import type { EntryKind, FamilyMember, SourceDetail } from "@/lib/types";
import type { MemberEmailDomain } from "@/lib/data/memberEmailDomains";
import type { ExtractedItem } from "./extract/extractEvents";

export interface MessageMeta {
  gmailMessageId: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: string | null;
  googleAccountEmail: string | null;
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
    googleAccountEmail: meta.googleAccountEmail ?? undefined,
  };
}

/** event / advisory / reminder land on the schedule (need a date); task
 * is deadline-style (date optional). */
const SCHEDULE_KINDS: EntryKind[] = ["event", "advisory", "reminder"];

export async function writeExtractedItems(
  items: ExtractedItem[],
  meta: MessageMeta,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[],
  arrivalRules: ArrivalBufferRule[]
): Promise<{ eventsCreated: number; todosCreated: number }> {
  const supabase = getSupabaseClient();
  const domainMemberId = resolveByDomain(meta.sender, emailDomains);
  let eventsCreated = 0;
  let todosCreated = 0;

  for (const item of items) {
    const subjectId = resolvePerson(item.person_hint, domainMemberId, familyMembers);
    const subject = familyMembers.find((m) => m.id === subjectId);
    const sourceDetail = buildSourceDetail(item, meta);
    const kind = item.kind;

    // Advisories are a household concept, never pinned to one person.
    const subjectMemberId = kind === "advisory" ? null : subjectId;
    const onSchedule = SCHEDULE_KINDS.includes(kind);

    if (onSchedule && !item.date) continue; // no date → not useful on the calendar

    const startsAt = onSchedule && item.date ? householdLocalToInstant(item.date, item.time) : null;
    const endsAt =
      startsAt && item.end_time ? householdLocalToInstant(item.date!, item.end_time) : null;

    let arrivalAt: string | null = null;
    let arrivalSource: "stated" | "inferred" | null = null;
    if (kind === "event" && item.date) {
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
        busy_status: kind === "event" ? "busy" : "free",
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
  }

  return { eventsCreated, todosCreated };
}
