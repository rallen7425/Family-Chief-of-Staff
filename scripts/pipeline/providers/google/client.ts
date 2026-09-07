import { google, gmail_v1 } from "googleapis";
import type { EmailConnection } from "../types";

/** Builds an authenticated Gmail client from an already-decrypted
 * connection's refresh token. Callers own fetching/decrypting the
 * connection row — this module only ever sees plaintext tokens in memory,
 * never touches the database or the encryption layer. */
export function getGmailClient(connection: EmailConnection): gmail_v1.Gmail {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: connection.refreshToken });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
