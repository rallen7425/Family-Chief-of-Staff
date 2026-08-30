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
