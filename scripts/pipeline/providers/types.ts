import type { EmailConnectionRow } from "@/lib/data/dbTypes";
import { decryptToken } from "@/lib/security/tokenCrypto";

/** An `email_connections` row with its tokens already decrypted, ready to
 * hand to a provider implementation. Provider code should never see
 * ciphertext or the encryption module directly. */
export interface EmailConnection {
  id: string;
  familyMemberId: string;
  provider: "google" | "microsoft";
  externalAccountEmail: string;
  refreshToken: string;
  accessToken: string | null;
}

export function toEmailConnection(row: EmailConnectionRow): EmailConnection {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    provider: row.provider,
    externalAccountEmail: row.external_account_email,
    refreshToken: decryptToken(hexBytea(row.refresh_token_enc)),
    accessToken: row.access_token_enc ? decryptToken(hexBytea(row.access_token_enc)) : null,
  };
}

/** PostgREST returns `bytea` columns as a `\x`-prefixed hex string, not raw
 * binary — decode that back into a Buffer before it reaches tokenCrypto. */
function hexBytea(value: string): Buffer {
  return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
}

export interface FetchedAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
}

/** The one message shape every provider maps its raw API response into —
 * everything downstream (attachment parsing, extraction, dedupe, write)
 * works with this and never sees a Gmail- or Graph-specific shape. */
export interface NormalizedEmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: string | null; // ISO
  bodyText: string;
  attachments: FetchedAttachment[];
}

export interface EmailProvider {
  listRecentMessageIds(connection: EmailConnection, sinceDays: number): Promise<string[]>;
  fetchMessageDetail(connection: EmailConnection, id: string): Promise<NormalizedEmailMessage>;
  fetchAttachmentBuffer(
    connection: EmailConnection,
    messageId: string,
    attachmentId: string
  ): Promise<Buffer>;
}
