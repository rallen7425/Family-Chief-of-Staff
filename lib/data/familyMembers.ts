import { getSupabaseClient } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";
import type { FamilyMemberRow } from "@/lib/data/dbTypes";

function mapFamilyMember(row: FamilyMemberRow): FamilyMember {
  return { id: row.id, name: row.name, accentColor: row.accent_color };
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .order("sort_order")
    .returns<FamilyMemberRow[]>();
  if (error) throw error;
  return data.map(mapFamilyMember);
}
