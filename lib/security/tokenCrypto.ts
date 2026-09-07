import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for OAuth tokens at rest (email_connections.
 * refresh_token_enc / access_token_enc). Ciphertext layout: 12-byte IV ||
 * 16-byte auth tag || actual ciphertext, all concatenated into one Buffer —
 * self-contained, no separate column needed for the IV/tag.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Missing CONNECTOR_TOKEN_ENCRYPTION_KEY — required to encrypt/decrypt stored OAuth tokens."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `CONNECTOR_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        `Generate one with: openssl rand -base64 32`
    );
  }
  return key;
}

export function encryptToken(plaintext: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptToken(encrypted: Buffer): string {
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** PostgREST represents a `bytea` column as a `\x`-prefixed hex string on
 * both read and write — these are the two conversions every caller storing
 * or reading email_connections.*_token_enc needs. */
export function encodeHexBytea(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}

export function decodeHexBytea(value: string): Buffer {
  return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
}
