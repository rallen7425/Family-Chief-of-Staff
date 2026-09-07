import { getSupabaseClient } from "@/lib/supabase";
import type { EmailConnectionRow } from "@/lib/data/dbTypes";

/** Every `active` connection with email scanning enabled — what the
 * email-scan pipeline loops over each run. Excludes `paused`,
 * `needs_reconnect`, and `disconnected` connections entirely: no fetch, no
 * provider calls, no cost. */
export async function getActiveEmailConnections(): Promise<EmailConnectionRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_connections")
    .select("*")
    .eq("status", "active")
    .eq("email_enabled", true)
    .returns<EmailConnectionRow[]>();
  if (error) throw error;
  return data;
}

/** Marks a connection as needing re-authentication (e.g. a refresh-token
 * failure like `invalid_grant`) instead of letting the pipeline silently
 * fail that connection every run — surfaced to the household as a status
 * badge once the Profile UI (Phase 1) reads it. */
export async function markConnectionNeedsReconnect(
  connectionId: string,
  errorMessage: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("email_connections")
    .update({ status: "needs_reconnect", last_error: errorMessage, updated_at: new Date().toISOString() })
    .eq("id", connectionId);
  if (error) throw error;
}

export async function updateLastSyncedAt(connectionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("email_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId);
  if (error) throw error;
}
