import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { EmailConnectionRow } from "@/lib/data/dbTypes";
import type { EmailConnectionSummary } from "@/lib/types";

function toSummary(row: EmailConnectionRow): EmailConnectionSummary {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    provider: row.provider,
    externalAccountEmail: row.external_account_email,
    status: row.status,
    emailEnabled: row.email_enabled,
    calendarEnabled: row.calendar_enabled,
    lastSyncedAt: row.last_synced_at ?? undefined,
    lastError: row.last_error ?? undefined,
    connectedAt: row.connected_at,
  };
}

/** One family member's own connections — the only ones they can see or
 * manage, on their own `/profile`. */
export const getEmailConnectionsByMember = cache(
  async (familyMemberId: string): Promise<EmailConnectionSummary[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("email_connections")
      .select("*")
      .eq("family_member_id", familyMemberId)
      .order("connected_at")
      .returns<EmailConnectionRow[]>();
    if (error) throw error;
    return data.map(toSummary);
  }
);

/** Every connection across the household, for the HoH-only read-only
 * oversight dashboard (`/settings/accounts`) — no controls live there,
 * management always happens on the owning member's own profile. */
export const getAllEmailConnections = cache(async (): Promise<EmailConnectionSummary[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_connections")
    .select("*")
    .order("connected_at")
    .returns<EmailConnectionRow[]>();
  if (error) throw error;
  return data.map(toSummary);
});

/** Ownership check used by every connector Server Action — a connection can
 * only be paused/resumed/deleted by the member who owns it (the same no-auth
 * "whoever the active-member cookie says" trust boundary as everything else
 * in this app, not a real permission system). */
export async function getEmailConnectionById(id: string): Promise<EmailConnectionRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("email_connections")
    .select("*")
    .eq("id", id)
    .maybeSingle<EmailConnectionRow>();
  if (error) throw error;
  return data;
}

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
