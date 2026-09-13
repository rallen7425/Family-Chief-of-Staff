import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";
import type { FamilyMemberRow } from "@/lib/data/dbTypes";

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
  };
}

/** Wrapped in React's cache() since both the root layout (for the chat
 * panel) and each page fetch this within the same request. */
export const getFamilyMembers = cache(async (): Promise<FamilyMember[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .order("sort_order")
    .returns<FamilyMemberRow[]>();
  if (error) throw error;
  return data.map(mapFamilyMember);
});

/** The one place sign-in/onboarding (lib/actions/auth.ts, the OAuth
 * callback route) decides "does this authenticated person already have a
 * household profile" — null means not yet (send them to onboarding).
 * Deliberately not exported from lib/auth/: linking a Supabase Auth user to
 * a family_members row is this app's own concept, not the shared identity
 * layer's. */
export async function getFamilyMemberByAuthUserId(authUserId: string): Promise<FamilyMember | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle<FamilyMemberRow>();
  if (error) throw error;
  return data ? mapFamilyMember(data) : null;
}
