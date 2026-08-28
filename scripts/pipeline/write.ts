import { getSupabaseClient } from "@/lib/supabase";
import { householdLocalToInstant } from "@/lib/householdTime";
import type { FamilyMember, SourceDetail } from "@/lib/types";
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

export async function writeExtractedItems(
  items: ExtractedItem[],
  meta: MessageMeta,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[]
): Promise<{ eventsCreated: number; todosCreated: number }> {
  const supabase = getSupabaseClient();
  const domainMemberId = resolveByDomain(meta.sender, emailDomains);
  let eventsCreated = 0;
  let todosCreated = 0;

  for (const item of items) {
    const familyMemberId = resolvePerson(item.person_hint, domainMemberId, familyMembers);
    const sourceDetail = buildSourceDetail(item, meta);

    if (item.kind === "event") {
      if (!item.date) continue; // an event with no date isn't useful on the calendar
      const { error } = await supabase.from("entries").insert({
        kind: "event",
        title: item.title,
        subject_member_id: familyMemberId,
        starts_at: householdLocalToInstant(item.date, item.time),
        is_all_day: !item.time,
        location_text: item.location,
        notes: item.notes,
        busy_status: "busy",
        scope: "family",
        status: "pending_review",
        source_type: "email_scan",
        source_detail: sourceDetail,
      });
      if (error) throw error;
      eventsCreated++;
    } else {
      const { error } = await supabase.from("entries").insert({
        kind: "task",
        title: item.title,
        subject_member_id: familyMemberId,
        due_at: item.date,
        is_all_day: false,
        busy_status: "free",
        scope: "family",
        status: "pending_review",
        source_type: "email_scan",
        source_detail: sourceDetail,
      });
      if (error) throw error;
      todosCreated++;
    }
  }

  return { eventsCreated, todosCreated };
}
