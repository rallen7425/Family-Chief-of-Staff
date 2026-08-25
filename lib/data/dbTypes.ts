import type { AccentColor, ItemStatus, SourceDetail, SourceType } from "@/lib/types";

/** Row shapes as they come back from Supabase (snake_case) — see the `rufus`
 * schema migration in rocky-coast-labs/supabase/migrations/. */

export interface FamilyMemberRow {
  id: string;
  name: string;
  accent_color: AccentColor;
  avatar_url: string | null;
  sort_order: number;
  is_adult: boolean;
}

export interface EventRow {
  id: string;
  title: string;
  family_member_id: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  status: ItemStatus;
  source_type: SourceType;
  source_detail: SourceDetail | null;
  recurrence_id: string | null;
  created_at: string;
}

export interface TodoRow {
  id: string;
  title: string;
  family_member_id: string | null;
  due_date: string | null;
  completed: boolean;
  status: ItemStatus;
  source_type: SourceType;
  source_detail: SourceDetail | null;
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
