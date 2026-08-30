import { getSupabaseClient } from "@/lib/supabase";
import type { MemberDetail } from "@/lib/types";
import type { MemberDetailRow } from "@/lib/data/dbTypes";

function mapDetail(row: MemberDetailRow): MemberDetail {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    label: row.label,
    value: row.value,
    fields: Array.isArray(row.fields) ? row.fields : [],
    ignored: row.ignored,
    source: row.source,
  };
}

/** The structured activities/teams/coaches list for one member, oldest first
 * (matches how it was entered). */
export async function getMemberDetails(memberId: string): Promise<MemberDetail[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_details")
    .select("*")
    .eq("family_member_id", memberId)
    .order("created_at")
    .returns<MemberDetailRow[]>();
  if (error) throw error;
  return data.map(mapDetail);
}
