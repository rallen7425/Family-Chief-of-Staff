import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getSupabaseClient } from "@/lib/supabase";
import { getActiveMember } from "@/lib/activeMember";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { encryptToken, encodeHexBytea } from "@/lib/security/tokenCrypto";
import { OAUTH_STATE_COOKIE } from "../start/route";

function redirectToProfile(request: Request, params: Record<string, string>) {
  const url = new URL("/profile", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  const response = (result: NextResponse) => {
    result.cookies.delete(OAUTH_STATE_COOKIE);
    return result;
  };

  if (oauthError) {
    return response(redirectToProfile(request, { connectError: oauthError }));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return response(redirectToProfile(request, { connectError: "invalid_state" }));
  }

  const activeMember = await getActiveMember(await getFamilyMembers());
  if (!activeMember) {
    return response(redirectToProfile(request, { connectError: "not_signed_in" }));
  }
  const familyMemberId = activeMember.id;

  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return response(redirectToProfile(request, { connectError: "server_misconfigured" }));
  }

  const redirectUri = new URL("/api/connectors/google/callback", request.url).toString();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      // Google only omits this if the account already granted this exact
      // client consent before without going through a fresh `prompt=consent`
      // — shouldn't happen here since start/route.ts always sets it, but
      // fail clearly rather than storing a connection with no refresh token.
      return response(redirectToProfile(request, { connectError: "no_refresh_token" }));
    }
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;
    if (!email) {
      return response(redirectToProfile(request, { connectError: "no_account_email" }));
    }

    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from("email_connections")
      .select("id, family_member_id")
      .eq("provider", "google")
      .eq("external_account_email", email)
      .maybeSingle();

    if (existing && existing.family_member_id !== familyMemberId) {
      // This Google account is already connected to a different family
      // member — don't silently reassign ownership.
      return response(redirectToProfile(request, { connectError: "already_connected_elsewhere" }));
    }

    const refreshTokenEnc = encodeHexBytea(encryptToken(tokens.refresh_token));
    const accessTokenEnc = tokens.access_token
      ? encodeHexBytea(encryptToken(tokens.access_token))
      : null;
    const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    if (existing) {
      // Re-connecting the same account (e.g. clearing a needs_reconnect
      // state) — refresh the tokens and reactivate.
      const { error } = await supabase
        .from("email_connections")
        .update({
          status: "active",
          last_error: null,
          refresh_token_enc: refreshTokenEnc,
          access_token_enc: accessTokenEnc,
          token_expiry: tokenExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("email_connections").insert({
        family_member_id: familyMemberId,
        provider: "google",
        external_account_email: email,
        status: "active",
        email_enabled: true,
        calendar_enabled: false,
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        refresh_token_enc: refreshTokenEnc,
        access_token_enc: accessTokenEnc,
        token_expiry: tokenExpiry,
      });
      if (error) throw error;
    }

    return response(redirectToProfile(request, { connected: "1" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response(redirectToProfile(request, { connectError: message.slice(0, 200) }));
  }
}
