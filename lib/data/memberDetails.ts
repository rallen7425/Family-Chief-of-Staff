import { cache } from "react";
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
    arrivalBufferMinutes: row.arrival_buffer_minutes,
    category: row.category,
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

/**
 * Every member's non-ignored details keyed by member id — backs the
 * EntryForm "Activity" picker so an event can bind to one activity and
 * inherit its arrival buffer. cache()d: several pages need it per request.
 */
export const getActivitiesByMember = cache(
  async (): Promise<Record<string, MemberDetail[]>> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("member_details")
      .select("*")
      .eq("ignored", false)
      .order("created_at")
      .returns<MemberDetailRow[]>();
    if (error) throw error;
    const byMember: Record<string, MemberDetail[]> = {};
    for (const row of data) {
      (byMember[row.family_member_id] ??= []).push(mapDetail(row));
    }
    return byMember;
  }
);
