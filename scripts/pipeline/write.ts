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
function extractSenderDomain(sender: string): string | null {
  const match = sender.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function resolvePerson(
  hint: string | null,
  sender: string,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[]
): string | null {
  if (hint) {
    const byName = familyMembers.find((m) => m.name.toLowerCase() === hint.toLowerCase());
    if (byName) return byName.id;
  }

  // Fallback: the LLM didn't name anyone (common for a school's automated
  // mailer addressed to parents generally), but the sender's domain is a
  // known school domain for a specific kid.
  const domain = extractSenderDomain(sender);
  if (!domain) return null;
  const rule = emailDomains.find((d) => domain === d.domain || domain.endsWith(`.${d.domain}`));
  return rule?.familyMemberId ?? null;
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
  let eventsCreated = 0;
  let todosCreated = 0;

  for (const item of items) {
    const familyMemberId = resolvePerson(item.person_hint, meta.sender, familyMembers, emailDomains);
    const sourceDetail = buildSourceDetail(item, meta);

    if (item.kind === "event") {
      if (!item.date) continue; // an event with no date isn't useful on the calendar
      const { error } = await supabase.from("events").insert({
        title: item.title,
        family_member_id: familyMemberId,
        starts_at: householdLocalToInstant(item.date, item.time),
        all_day: !item.time,
        location: item.location,
        notes: item.notes,
        status: "pending_review",
        source_type: "email_scan",
        source_detail: sourceDetail,
      });
      if (error) throw error;
      eventsCreated++;
    } else {
      const { error } = await supabase.from("todos").insert({
        title: item.title,
        family_member_id: familyMemberId,
        due_date: item.date,
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
