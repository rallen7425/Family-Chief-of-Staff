/**
 * One-time local setup script — not part of the deployed app.
 * Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/gmail/get-refresh-token.ts
 *
 * Opens the Google consent flow for a single Gmail mailbox (read-only scope),
 * then stores the resulting refresh token in rufus.gmail_credentials so the
 * email-scan pipeline (Phase 7) can use it without ever re-prompting for login.
 */
import http from "http";
import { google } from "googleapis";
import { getSupabaseClient } from "../../lib/supabase";

const PORT = 3457;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function main() {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET must be set in .env.local");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account authorized before
    scope: SCOPES,
  });

  console.log("\nOpen this URL and sign in with the Gmail account to connect:\n");
  console.log(authUrl);
  console.log("\nWaiting for sign-in to complete...\n");

  const code = await waitForAuthCode();

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned. If this app was already authorized once before, revoke access at " +
        "https://myaccount.google.com/permissions and run this script again (prompt=consent should " +
        "normally prevent this, but Google occasionally still skips issuing one)."
    );
  }
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress;
  if (!email) throw new Error("Could not determine the connected Gmail address.");

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("gmail_credentials").upsert({
    id: 1,
    google_account_email: email,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: SCOPES.join(" "),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  console.log(`\nConnected: ${email}`);
  console.log("Refresh token stored in rufus.gmail_credentials.\n");
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      if (error) {
        res.end(`<h1>Authorization failed</h1><p>${error}</p><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`Google returned an error: ${error}`));
        return;
      }

      res.end("<h1>Connected</h1><p>You can close this tab and return to the terminal.</p>");
      server.close();
      if (code) resolve(code);
      else reject(new Error("No authorization code in the callback."));
    });
    server.listen(PORT);
  });
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
