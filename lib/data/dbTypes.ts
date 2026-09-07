import type { AccentColor, EntryKind, ItemStatus, SourceDetail, SourceType } from "@/lib/types";

/** Row shapes as they come back from Supabase (snake_case) — see the
 * `family_chief_of_staff` schema migration in rocky-coast-labs/supabase/migrations/. */

export interface FamilyMemberRow {
  id: string;
  name: string;
  accent_color: AccentColor;
  avatar_url: string | null;
  sort_order: number;
  is_adult: boolean;
  relationship: string | null;
  is_head_of_household: boolean;
  birthday: string | null; // YYYY-MM-DD
  email: string | null;
  phone: string | null;
  school: string | null;
  grade: string | null;
}

export interface MemberDetailRow {
  id: string;
  family_member_id: string;
  label: string;
  value: string;
  fields: { label: string; value: string }[];
  ignored: boolean;
  source: "manual" | "detected" | "voice";
  /** Per-activity arrival buffer (minutes). Null = no activity-specific
   * buffer; arrival inference falls back to the category rule. */
  arrival_buffer_minutes: number | null;
  /** game | practice | rehearsal | appointment | other — lets an activity's
   * buffer also serve as the category-rule fallback for matching entries. */
  category: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of `family_chief_of_staff.entries` — the unified table that
 * replaced `events` + `todos` in the P1 redesign. */
export interface EntryRow {
  id: string;
  kind: EntryKind;
  title: string;
  notes: string | null;
  location_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  busy_status: "busy" | "free";
  scope: "personal" | "family";
  subject_member_id: string | null;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null; // YYYY-MM-DD
  is_all_day: boolean;
  arrival_at: string | null;
  arrival_source: "stated" | "inferred" | "manual" | null;
  recurrence_id: string | null;
  recurrence_until: string | null; // YYYY-MM-DD
  linked_entry_id: string | null;
  /** The subject member's activity (member_details row) this entry belongs
   * to, if any — drives the per-activity arrival buffer. */
  member_detail_id: string | null;
  is_critical: boolean;
  status: ItemStatus;
  completed_at: string | null;
  source_type: SourceType;
  source_detail: SourceDetail | null;
  created_at: string;
  updated_at: string;
}

export interface EntryOwnerRow {
  entry_id: string;
  family_member_id: string;
}

export interface KeepInMindRow {
  id: string;
  body: string;
  icon: string | null;
  family_member_id: string | null;
  dismissed: boolean;
}

export interface MemberEmailDomainRow {
  id: string;
  family_member_id: string;
  domain: string;
}

/** `family_chief_of_staff.notification_dismissals` — household-wide
 * "dismissed" state for a derived notification, keyed by its stable id. */
export interface NotificationDismissalRow {
  notification_id: string;
  dismissed_at: string;
}

/** `family_chief_of_staff.email_connections` — one row per (provider,
 * external account), owned by exactly one family member. Replaces the old
 * `gmail_credentials` singleton. Token columns are AES-256-GCM ciphertext
 * (lib/security/tokenCrypto.ts) — never read/written as plaintext. */
export interface EmailConnectionRow {
  id: string;
  family_member_id: string;
  provider: "google" | "microsoft";
  external_account_email: string;
  status: "active" | "paused" | "needs_reconnect" | "disconnected";
  email_enabled: boolean;
  calendar_enabled: boolean;
  scopes: string[];
  refresh_token_enc: string; // bytea comes back from PostgREST as a hex-encoded string ("\\x...")
  access_token_enc: string | null;
  token_expiry: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  connected_at: string;
  updated_at: string;
}
