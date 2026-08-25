import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";
import type { FamilyMemberRow } from "@/lib/data/dbTypes";

function mapFamilyMember(row: FamilyMemberRow): FamilyMember {
  return { id: row.id, name: row.name, accentColor: row.accent_color, isAdult: row.is_adult };
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
