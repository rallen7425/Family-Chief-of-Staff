import { getSupabaseClient } from "@/lib/supabase";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getMemberEmailDomains } from "@/lib/data/memberEmailDomains";
import { getGmailClient } from "./gmail/client";
import { listRecentMessageIds, fetchMessageDetail } from "./gmail/fetchMessages";
import { fetchAttachmentBuffer } from "./gmail/fetchAttachments";
import { parseDocxBuffer } from "./extract/parseDocx";
import { parsePdfBuffer } from "./extract/parsePdf";
import { extractItemsFromMessage, type MessageAttachmentContent } from "./extract/extractEvents";
import { writeExtractedItems } from "./write";

export interface PipelineResult {
  scanned: number;
  skipped: number;
  processed: number;
  errors: number;
  eventsCreated: number;
  todosCreated: number;
  details: { messageId: string; status: "processed" | "skipped" | "error"; note?: string }[];
}

export async function runGmailScanPipeline(): Promise<PipelineResult> {
  const supabase = getSupabaseClient();
  const gmail = await getGmailClient();
  const familyMembers = await getFamilyMembers();
  const emailDomains = await getMemberEmailDomains();

  const { data: gmailCreds } = await supabase
    .from("gmail_credentials")
    .select("google_account_email")
    .eq("id", 1)
    .maybeSingle();
  const googleAccountEmail = gmailCreds?.google_account_email ?? null;

  const messageIds = await listRecentMessageIds(gmail);

  const result: PipelineResult = {
    scanned: messageIds.length,
    skipped: 0,
    processed: 0,
    errors: 0,
    eventsCreated: 0,
    todosCreated: 0,
    details: [],
  };

  for (const messageId of messageIds) {
    // Dedupe before any expensive work (fetch/parse/Claude) — mirrors
    // Distilled's dedupe-before-enrichment pattern, avoiding redundant
    // Claude calls on emails already scanned by a previous run.
    const { data: existing } = await supabase
      .from("email_scan_log")
      .select("id")
      .eq("gmail_message_id", messageId)
      .maybeSingle();
    if (existing) {
      result.skipped++;
      result.details.push({ messageId, status: "skipped", note: "already processed" });
      continue;
    }

    try {
      const message = await fetchMessageDetail(gmail, messageId);

      const attachments: MessageAttachmentContent[] = [];
      for (const attachment of message.attachments) {
        const buffer = await fetchAttachmentBuffer(gmail, messageId, attachment.attachmentId);
        if (attachment.mimeType === "application/pdf") {
          const pages = await parsePdfBuffer(buffer);
          attachments.push({ name: attachment.filename, pages, text: pages.join("\n") });
        } else {
          const text = await parseDocxBuffer(buffer);
          attachments.push({ name: attachment.filename, pages: null, text });
        }
      }

      const items = await extractItemsFromMessage(
        {
          subject: message.subject,
          sender: message.sender,
          bodyText: message.bodyText,
          attachments,
          receivedAt: message.receivedAt,
        },
        familyMembers
      );

      const { eventsCreated, todosCreated } = await writeExtractedItems(
        items,
        {
          gmailMessageId: message.id,
          threadId: message.threadId,
          sender: message.sender,
          subject: message.subject,
          receivedAt: message.receivedAt,
          googleAccountEmail,
        },
        familyMembers,
        emailDomains
      );

      await supabase.from("email_scan_log").insert({
        gmail_message_id: message.id,
        thread_id: message.threadId,
        sender: message.sender,
        subject: message.subject,
        received_at: message.receivedAt,
        events_created: eventsCreated,
        todos_created: todosCreated,
        status: "processed",
      });

      result.processed++;
      result.eventsCreated += eventsCreated;
      result.todosCreated += todosCreated;
      result.details.push({
        messageId,
        status: "processed",
        note: `${eventsCreated} event(s), ${todosCreated} todo(s)`,
      });
    } catch (err) {
      // One message's failure shouldn't block the rest of the run.
      const errorDetail = err instanceof Error ? err.message : String(err);
      await supabase.from("email_scan_log").insert({
        gmail_message_id: messageId,
        status: "error",
        error_detail: errorDetail,
      });
      result.errors++;
      result.details.push({ messageId, status: "error", note: errorDetail });
    }
  }

  return result;
}
