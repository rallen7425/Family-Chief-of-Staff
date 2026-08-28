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
import { mapWithConcurrency } from "@/lib/concurrency";
import type { FamilyMember } from "@/lib/types";
import type { MemberEmailDomain } from "@/lib/data/memberEmailDomains";
import type { gmail_v1 } from "googleapis";

/**
 * How many not-yet-seen messages one invocation will actually fetch/parse/
 * extract. This route runs on Vercel Hobby, capped at 60s (maxDuration), and
 * each message costs a Gmail fetch + optional attachment parse + one Claude
 * call — a burst of ~15+ new emails blew past 60s and the function 504'd.
 * Anything over the cap is left for the next cron tick (every 2h), which
 * picks it up because it's still unlogged. Steady-state volume is 1-5
 * new emails per run, so the cap only bites when draining a backlog.
 */
const MAX_MESSAGES_PER_RUN = 8;

/** Messages processed in parallel within a run. Each one is independent
 * (its own Gmail calls, Claude call, and inserts); 4-way is well within
 * Gmail's per-user quota and keeps the worst case comfortably under 60s. */
const MESSAGE_CONCURRENCY = 4;

export interface PipelineResult {
  scanned: number;
  skipped: number;
  /** New messages left unprocessed this run because of MAX_MESSAGES_PER_RUN —
   * not an error; the next scheduled run will pick them up. */
  deferred: number;
  processed: number;
  errors: number;
  eventsCreated: number;
  todosCreated: number;
  details: { messageId: string; status: "processed" | "skipped" | "error" | "deferred"; note?: string }[];
}

interface MessageOutcome {
  messageId: string;
  status: "processed" | "error";
  note: string;
  eventsCreated: number;
  todosCreated: number;
}

async function processMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  googleAccountEmail: string | null,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[]
): Promise<MessageOutcome> {
  const supabase = getSupabaseClient();
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

    return {
      messageId,
      status: "processed",
      note: `${eventsCreated} event(s), ${todosCreated} todo(s)`,
      eventsCreated,
      todosCreated,
    };
  } catch (err) {
    // One message's failure shouldn't block the rest of the run.
    const errorDetail = err instanceof Error ? err.message : String(err);
    await supabase.from("email_scan_log").insert({
      gmail_message_id: messageId,
      status: "error",
      error_detail: errorDetail,
    });
    return { messageId, status: "error", note: errorDetail, eventsCreated: 0, todosCreated: 0 };
  }
}

export async function runGmailScanPipeline(): Promise<PipelineResult> {
  const supabase = getSupabaseClient();
  const [{ gmail, googleAccountEmail }, familyMembers, emailDomains] = await Promise.all([
    getGmailClient(),
    getFamilyMembers(),
    getMemberEmailDomains(),
  ]);

  const messageIds = await listRecentMessageIds(gmail);

  const result: PipelineResult = {
    scanned: messageIds.length,
    skipped: 0,
    deferred: 0,
    processed: 0,
    errors: 0,
    eventsCreated: 0,
    todosCreated: 0,
    details: [],
  };

  // Dedupe up front in one query rather than one round-trip per message —
  // mirrors Distilled's dedupe-before-enrichment pattern, avoiding redundant
  // Claude calls on emails already scanned by a previous run.
  const { data: seenRows } = await supabase
    .from("email_scan_log")
    .select("gmail_message_id")
    .in("gmail_message_id", messageIds);
  const seen = new Set((seenRows ?? []).map((r) => r.gmail_message_id));

  for (const id of messageIds) {
    if (seen.has(id)) {
      result.skipped++;
      result.details.push({ messageId: id, status: "skipped", note: "already processed" });
    }
  }

  // Gmail returns newest-first; process oldest-first so a backlog drains in
  // arrival order and nothing is stranded past the newer_than:2d window.
  const newMessageIds = messageIds.filter((id) => !seen.has(id)).reverse();
  const toProcess = newMessageIds.slice(0, MAX_MESSAGES_PER_RUN);
  const deferred = newMessageIds.slice(MAX_MESSAGES_PER_RUN);

  for (const id of deferred) {
    result.deferred++;
    result.details.push({ messageId: id, status: "deferred", note: "over per-run cap; next run" });
  }

  const outcomes = await mapWithConcurrency(toProcess, MESSAGE_CONCURRENCY, (id) =>
    processMessage(gmail, id, googleAccountEmail, familyMembers, emailDomains)
  );

  for (const outcome of outcomes) {
    if (outcome.status === "processed") {
      result.processed++;
      result.eventsCreated += outcome.eventsCreated;
      result.todosCreated += outcome.todosCreated;
    } else {
      result.errors++;
    }
    result.details.push({ messageId: outcome.messageId, status: outcome.status, note: outcome.note });
  }

  return result;
}
