/**
 * One-time backfill for the email/calendar connectors rework (Phase 0).
 * Copies the single existing `gmail_credentials` row (id=1) into a real
 * `email_connections` row, encrypting its refresh token, and attributes it
 * to a family member using the same resolution logic
 * app/settings/accounts/page.tsx already uses for display purposes.
 *
 * Does NOT touch or drop `gmail_credentials` — that stays in place until
 * the new table is verified live (see email-calendar-connectors-plan.md).
 * Safe to re-run: it's a no-op if a matching (provider, external_account_email)
 * connection already exists.
 *
 * Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/backfill-email-connections.ts
 */
import { getSupabaseClient } from "../../lib/supabase";
import { getFamilyMembers } from "../../lib/data/familyMembers";
import { encryptToken } from "../../lib/security/tokenCrypto";

interface GmailCredentialsRow {
  google_account_email: string;
  refresh_token: string;
  scopes: string | null;
}

async function main() {
  const supabase = getSupabaseClient();

  const { data: creds, error } = await supabase
    .from("gmail_credentials")
    .select("google_account_email, refresh_token, scopes")
    .eq("id", 1)
    .single<GmailCredentialsRow>();
  if (error) throw error;
  if (!creds) throw new Error("No gmail_credentials row found — nothing to backfill.");

  const { data: existing } = await supabase
    .from("email_connections")
    .select("id")
    .eq("provider", "google")
    .eq("external_account_email", creds.google_account_email)
    .maybeSingle();
  if (existing) {
    console.log(`Already backfilled: email_connections row ${existing.id} for ${creds.google_account_email}.`);
    return;
  }

  const familyMembers = await getFamilyMembers();
  const adults = familyMembers.filter((m) => m.isAdult);
  const ownerId =
    adults.find((m) => m.email?.toLowerCase() === creds.google_account_email.toLowerCase())?.id ||
    adults.find((m) => m.isHeadOfHousehold)?.id ||
    adults[0]?.id;
  if (!ownerId) throw new Error("No adult family member found to own this connection.");

  const owner = familyMembers.find((m) => m.id === ownerId)!;
  const refreshTokenEnc = encryptToken(creds.refresh_token);

  const { data: inserted, error: insertError } = await supabase
    .from("email_connections")
    .insert({
      family_member_id: ownerId,
      provider: "google",
      external_account_email: creds.google_account_email,
      status: "active",
      email_enabled: true,
      calendar_enabled: false,
      scopes: creds.scopes ? creds.scopes.split(" ") : ["https://www.googleapis.com/auth/gmail.readonly"],
      refresh_token_enc: `\\x${refreshTokenEnc.toString("hex")}`,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  console.log(`Created email_connections row ${inserted.id}`);
  console.log(`  provider: google, account: ${creds.google_account_email}, owner: ${owner.name} (${ownerId})`);

  // Historical email_scan_log rows were all scanned from this one mailbox —
  // attach the new connection id so the per-connection dedupe query (see
  // scripts/pipeline/index.ts) is scoped correctly from here on.
  const { data: updatedRows, error: backfillLogError } = await supabase
    .from("email_scan_log")
    .update({ connection_id: inserted.id })
    .is("connection_id", null)
    .select("id");
  if (backfillLogError) throw backfillLogError;
  console.log(`Backfilled connection_id on ${updatedRows?.length ?? 0} existing email_scan_log row(s).`);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
