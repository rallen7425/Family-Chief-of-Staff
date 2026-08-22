import type { gmail_v1 } from "googleapis";

export async function fetchAttachmentBuffer(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  const data = res.data.data;
  if (!data) throw new Error("Attachment data missing");
  return Buffer.from(data, "base64url");
}
