import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { google } from "googleapis";
import { getActiveMember } from "@/lib/activeMember";
import { getFamilyMembers } from "@/lib/data/familyMembers";

export const OAUTH_STATE_COOKIE = "fcos_oauth_state";

/**
 * Starts the in-app Google OAuth consent flow. "Who is connecting" is
 * whoever the app currently resolves as using this device — the same
 * no-auth trust boundary as every other write in this app, extended to a
 * new surface rather than inventing a new one. No query params needed.
 */
export async function GET(request: Request) {
  const activeMember = await getActiveMember(await getFamilyMembers());
  if (!activeMember) {
    return NextResponse.redirect(new URL("/settings/switch", request.url));
  }

  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET" }, { status: 500 });
  }

  const redirectUri = new URL("/api/connectors/google/callback", request.url).toString();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const state = randomBytes(24).toString("base64url");
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account authorized before
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes — plenty for a consent flow, short-lived by design
    path: "/",
  });
  return response;
}
