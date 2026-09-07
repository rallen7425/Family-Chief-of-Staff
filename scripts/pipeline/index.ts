import { getSupabaseClient } from "@/lib/supabase";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getMemberEmailDomains } from "@/lib/data/memberEmailDomains";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { getActiveEmailConnections, markConnectionNeedsReconnect, updateLastSyncedAt } from "@/lib/data/emailConnections";
import type { ArrivalBufferRule } from "@/lib/arrival";
import { toEmailConnection, type EmailConnection, type EmailProvider } from "./providers/types";
import { googleEmailProvider } from "./providers/google/email";
import { parseDocxBuffer } from "./extract/parseDocx";
import { parsePdfBuffer } from "./extract/parsePdf";
import { extractItemsFromMessage, type MessageAttachmentContent } from "./extract/extractEvents";
import { writeExtractedItems } from "./write";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { FamilyMember } from "@/lib/types";
import type { MemberEmailDomain } from "@/lib/data/memberEmailDomains";

// microsoft: added in a later phase — deliberately absent rather than
// aliased to another provider, so a misconfigured/premature microsoft
// connection fails loudly instead of silently hitting the wrong API.
const providers: Partial<Record<EmailConnection["provider"], EmailProvider>> = {
  google: googleEmailProvider,
};

/**
 * How many not-yet-seen messages one connection contributes per invocation.
 * Applied per connection (not globally) so N mailboxes don't starve each
 * other under one shared budget — each connection gets its own fetch/parse/
 * extract allowance within the run's overall time budget (maxDuration on the
 * route). Steady-state volume is 1-5 new emails per connection per run, so
 * the cap only bites when draining a backlog.
 */
const MAX_MESSAGES_PER_CONNECTION_PER_RUN = 8;

/** Messages processed in parallel within one connection's batch. Each one is
 * independent (its own provider calls, Claude call, and inserts); 4-way is
 * well within a provider's per-user quota and keeps the worst case
 * comfortably under the route's time budget. */
const MESSAGE_CONCURRENCY = 4;

const SCAN_WINDOW_DAYS = 4;

export interface PipelineResult {
  scanned: number;
  skipped: number;
  /** New messages left unprocessed this run because of the per-connection
   * cap — not an error; the next scheduled run will pick them up. */
  deferred: number;
  processed: number;
  errors: number;
  eventsCreated: number;
  todosCreated: number;
  /** New items folded into an existing entry by cross-email dedupe instead
   * of inserted as a new row. */
  merged: number;
  details: { messageId: string; status: "processed" | "skipped" | "error" | "deferred"; note?: string }[];
}

interface MessageOutcome {
  messageId: string;
  status: "processed" | "error";
  note: string;
  eventsCreated: number;
  todosCreated: number;
  merged: number;
}

async function processMessage(
  provider: EmailProvider,
  connection: EmailConnection,
  messageId: string,
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[],
  arrivalRules: ArrivalBufferRule[]
): Promise<MessageOutcome> {
  const supabase = getSupabaseClient();
  try {
    const message = await provider.fetchMessageDetail(connection, messageId);

    const attachments: MessageAttachmentContent[] = [];
    for (const attachment of message.attachments) {
      const buffer = await provider.fetchAttachmentBuffer(connection, messageId, attachment.attachmentId);
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

    const { eventsCreated, todosCreated, merged } = await writeExtractedItems(
      items,
      {
        gmailMessageId: message.id,
        threadId: message.threadId,
        sender: message.sender,
        subject: message.subject,
        receivedAt: message.receivedAt,
        provider: connection.provider,
        accountEmail: connection.externalAccountEmail,
        connectionId: connection.id,
      },
      familyMembers,
      emailDomains,
      arrivalRules
    );

    await supabase.from("email_scan_log").insert({
      gmail_message_id: message.id,
      connection_id: connection.id,
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
      note: `${eventsCreated} event(s), ${todosCreated} todo(s)${merged ? `, ${merged} merged into existing` : ""}`,
      eventsCreated,
      todosCreated,
      merged,
    };
  } catch (err) {
    // One message's failure shouldn't block the rest of the run.
    const errorDetail = err instanceof Error ? err.message : String(err);
    await supabase.from("email_scan_log").insert({
      gmail_message_id: messageId,
      connection_id: connection.id,
      status: "error",
      error_detail: errorDetail,
    });
    return { messageId, status: "error", note: errorDetail, eventsCreated: 0, todosCreated: 0, merged: 0 };
  }
}

/** A connection-level failure (can't even list messages — e.g. an expired/
 * revoked refresh token) is different from a single message's failure:
 * retrying every run against a dead connection wastes calls and hides the
 * real problem. Recognize the common "refresh token is dead" shape and mark
 * the connection accordingly rather than silently failing every run. */
function isAuthFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /invalid_grant|invalid_client|unauthorized_client/i.test(message);
}

async function processConnection(
  connectionRow: Parameters<typeof toEmailConnection>[0],
  familyMembers: FamilyMember[],
  emailDomains: MemberEmailDomain[],
  arrivalRules: ArrivalBufferRule[],
  result: PipelineResult
): Promise<void> {
  const supabase = getSupabaseClient();
  const connection = toEmailConnection(connectionRow);
  const provider = providers[connection.provider];
  if (!provider) {
    result.errors++;
    result.details.push({
      messageId: connection.externalAccountEmail,
      status: "error",
      note: `No provider implementation registered for "${connection.provider}"`,
    });
    return;
  }

  let messageIds: string[];
  try {
    messageIds = await provider.listRecentMessageIds(connection, SCAN_WINDOW_DAYS);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    if (isAuthFailure(err)) {
      await markConnectionNeedsReconnect(connection.id, errorDetail);
    }
    result.errors++;
    result.details.push({ messageId: connection.externalAccountEmail, status: "error", note: errorDetail });
    return;
  }

  result.scanned += messageIds.length;

  // Dedupe up front in one query rather than one round-trip per message —
  // mirrors Distilled's dedupe-before-enrichment pattern, avoiding redundant
  // Claude calls on emails already scanned by a previous run. Scoped to this
  // connection: a Gmail-internal message id is only guaranteed unique within
  // one mailbox, so cross-connection collisions (astronomically unlikely,
  // but structurally possible now that more than one mailbox can exist)
  // shouldn't cause one account's message to be skipped as "already seen"
  // because a different account logged the same id string.
  const { data: seenRows } = await supabase
    .from("email_scan_log")
    .select("gmail_message_id")
    .eq("connection_id", connection.id)
    .in("gmail_message_id", messageIds);
  const seen = new Set((seenRows ?? []).map((r) => r.gmail_message_id));

  for (const id of messageIds) {
    if (seen.has(id)) {
      result.skipped++;
      result.details.push({ messageId: id, status: "skipped", note: "already processed" });
    }
  }

  // Providers return newest-first; process oldest-first so a backlog drains
  // in arrival order and nothing is stranded past the scan window.
  const newMessageIds = messageIds.filter((id) => !seen.has(id)).reverse();
  const toProcess = newMessageIds.slice(0, MAX_MESSAGES_PER_CONNECTION_PER_RUN);
  const deferred = newMessageIds.slice(MAX_MESSAGES_PER_CONNECTION_PER_RUN);

  for (const id of deferred) {
    result.deferred++;
    result.details.push({ messageId: id, status: "deferred", note: "over per-run cap; next run" });
  }

  const outcomes = await mapWithConcurrency(toProcess, MESSAGE_CONCURRENCY, (id) =>
    processMessage(provider, connection, id, familyMembers, emailDomains, arrivalRules)
  );

  for (const outcome of outcomes) {
    if (outcome.status === "processed") {
      result.processed++;
      result.eventsCreated += outcome.eventsCreated;
      result.todosCreated += outcome.todosCreated;
      result.merged += outcome.merged;
    } else {
      result.errors++;
    }
    result.details.push({ messageId: outcome.messageId, status: outcome.status, note: outcome.note });
  }

  if (toProcess.length > 0) {
    await updateLastSyncedAt(connection.id);
  }
}

export async function runEmailScanPipeline(): Promise<PipelineResult> {
  const [connections, familyMembers, emailDomains, arrivalRules] = await Promise.all([
    getActiveEmailConnections(),
    getFamilyMembers(),
    getMemberEmailDomains(),
    getArrivalBufferRules(),
  ]);

  const result: PipelineResult = {
    scanned: 0,
    skipped: 0,
    deferred: 0,
    processed: 0,
    errors: 0,
    eventsCreated: 0,
    todosCreated: 0,
    merged: 0,
    details: [],
  };

  for (const connectionRow of connections) {
    await processConnection(connectionRow, familyMembers, emailDomains, arrivalRules, result);
  }

  return result;
}
