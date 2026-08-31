import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/** The single connected household Gmail mailbox (the one `id = 1` row), or
 * null. Per-member Gmail is a future model — see Manage Connected Accounts. */
export const getConnectedGmailAccount = cache(async (): Promise<string | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("gmail_credentials")
    .select("google_account_email")
    .limit(1)
    .returns<{ google_account_email: string | null }[]>();
  if (error) throw error;
  return data[0]?.google_account_email ?? null;
});
