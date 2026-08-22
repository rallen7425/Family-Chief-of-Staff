import { getSupabaseClient } from "@/lib/supabase";
import { householdLocalToInstant } from "@/lib/householdTime";
import type { FamilyMember, SourceDetail } from "@/lib/types";
import type { ExtractedItem } from "./extract/extractEvents";

export interface MessageMeta {
  gmailMessageId: string;
  threadId: string;
  sender: string;
  subject: string;
}

function resolvePerson(hint: string | null, familyMembers: FamilyMember[]): string | null {
  if (!hint) return null;
  return familyMembers.find((m) => m.name.toLowerCase() === hint.toLowerCase())?.id ?? null;
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
  };
}

export async function writeExtractedItems(
  items: ExtractedItem[],
  meta: MessageMeta,
  familyMembers: FamilyMember[]
): Promise<{ eventsCreated: number; todosCreated: number }> {
  const supabase = getSupabaseClient();
  let eventsCreated = 0;
  let todosCreated = 0;

  for (const item of items) {
    const familyMemberId = resolvePerson(item.person_hint, familyMembers);
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
