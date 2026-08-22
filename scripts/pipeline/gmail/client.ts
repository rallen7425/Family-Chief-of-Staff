import { google, gmail_v1 } from "googleapis";
import { getSupabaseClient } from "@/lib/supabase";

/** Builds an authenticated Gmail client from the stored refresh token
 * (written once by scripts/gmail/get-refresh-token.ts). */
export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET");
  }

  const supabase = getSupabaseClient();
  const { data: creds, error } = await supabase
    .from("gmail_credentials")
    .select("refresh_token")
    .eq("id", 1)
    .single();
  if (error) throw error;
  if (!creds?.refresh_token) {
    throw new Error(
      "No Gmail refresh token stored. Run scripts/gmail/get-refresh-token.ts first."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: creds.refresh_token });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
