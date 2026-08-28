import type { gmail_v1 } from "googleapis";

export interface FetchedAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
}

export interface FetchedMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: string | null; // ISO, from internalDate
  bodyText: string;
  attachments: FetchedAttachment[];
}

const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/pdf",
]);

export async function listRecentMessageIds(
  gmail: gmail_v1.Gmail,
  // 4-day window (cron runs every 2h) gives comfortable slack: the pipeline
  // processes at most MAX_MESSAGES_PER_RUN new messages per run, so during a
  // backlog an unprocessed message must survive several runs before its turn —
  // a 2-day window could let the oldest ones age out unseen.
  query = "newer_than:4d"
): Promise<string[]> {
  const res = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 50 });
  return (res.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface WalkState {
  plainText: string | null;
  htmlText: string | null;
  attachments: FetchedAttachment[];
}

function walkParts(part: gmail_v1.Schema$MessagePart, state: WalkState) {
  if (part.mimeType === "text/plain" && part.body?.data && !state.plainText) {
    state.plainText = decodeBase64Url(part.body.data);
  } else if (part.mimeType === "text/html" && part.body?.data && !state.htmlText) {
    state.htmlText = decodeBase64Url(part.body.data);
  } else if (
    part.filename &&
    part.body?.attachmentId &&
    part.mimeType &&
    SUPPORTED_ATTACHMENT_MIME_TYPES.has(part.mimeType)
  ) {
    state.attachments.push({
      filename: part.filename,
      mimeType: part.mimeType,
      attachmentId: part.body.attachmentId,
    });
  }

  for (const child of part.parts ?? []) {
    walkParts(child, state);
  }
}

export async function fetchMessageDetail(gmail: gmail_v1.Gmail, id: string): Promise<FetchedMessage> {
  const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const message = res.data;
  const headers = message.payload?.headers ?? [];
  const sender = headers.find((h) => h.name === "From")?.value ?? "";
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";

  const state: WalkState = { plainText: null, htmlText: null, attachments: [] };
  if (message.payload) walkParts(message.payload, state);

  // Some senders (Veracross, SJP's mailer) attach a near-empty text/plain
  // part — a blank string or just an HTML comment placeholder — alongside
  // the real content in text/html. Preferring "plainText exists" over
  // "plainText has anything in it" silently discarded the actual email
  // body for those senders. Fall back to the HTML part whenever the plain
  // part isn't actually meaningful text.
  const meaningfulPlainText = state.plainText?.replace(/<!--[\s\S]*?-->/g, "").trim() ?? "";
  const bodyText =
    meaningfulPlainText.length > 10
      ? meaningfulPlainText
      : state.htmlText
        ? stripHtml(state.htmlText)
        : meaningfulPlainText;

  return {
    id: message.id!,
    threadId: message.threadId ?? "",
    sender,
    subject,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    bodyText,
    attachments: state.attachments,
  };
}
