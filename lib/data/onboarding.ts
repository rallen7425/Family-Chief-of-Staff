import { getSupabaseClient } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";
import type { FamilyMemberRow } from "@/lib/data/dbTypes";

/**
 * Onboarding's own household-scoped queries — new as of the
 * Identity/Sign-In/Onboarding pass (2026-09-12). Deliberately separate
 * from lib/data/familyMembers.ts's `getFamilyMembers()`, which fetches
 * every member unscoped (a real, accepted gap for now — see CLAUDE.md's
 * 2026-09-12 note): onboarding is brand-new code building a brand-new
 * household, so it must get this right from the start even though the
 * rest of the app doesn't filter by household_id yet.
 */

function mapFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    name: row.name,
    accentColor: row.accent_color,
    isAdult: row.is_adult,
    relationship: row.relationship ?? undefined,
    isHeadOfHousehold: row.is_head_of_household ?? false,
    birthday: row.birthday ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    school: row.school ?? undefined,
    grade: row.grade ?? undefined,
    householdId: row.household_id,
  };
}

export interface HouseholdSummary {
  id: string;
  name: string | null;
}

export async function getHousehold(householdId: string): Promise<HouseholdSummary | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("households")
    .select("id, name")
    .eq("id", householdId)
    .maybeSingle<HouseholdSummary>();
  if (error) throw error;
  return data;
}

/** This household's roster so far, in the order added. */
export async function getHouseholdMembers(householdId: string): Promise<FamilyMember[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order")
    .returns<FamilyMemberRow[]>();
  if (error) throw error;
  return data.map(mapFamilyMember);
}

/** Who currently holds approval authority in this household — only
 * meaningful for the Permissions step, so kept out of the shared
 * FamilyMember type rather than adding a field nothing else reads yet. */
export async function getApprovalAuthorityHolderId(householdId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("has_approval_authority", true)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data?.id ?? null;
}
