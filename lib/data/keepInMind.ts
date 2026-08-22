import { getSupabaseClient } from "@/lib/supabase";
import type { KeepInMindItem } from "@/lib/types";
import type { KeepInMindRow } from "@/lib/data/dbTypes";

function mapKeepInMindItem(row: KeepInMindRow): KeepInMindItem {
  return {
    id: row.id,
    body: row.body,
    icon: (row.icon as KeepInMindItem["icon"]) ?? "reminder",
    familyMemberId: row.family_member_id,
    dismissed: row.dismissed,
  };
}

export async function getActiveKeepInMindItems(): Promise<KeepInMindItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("keep_in_mind_items")
    .select("*")
    .eq("dismissed", false)
    .order("created_at")
    .returns<KeepInMindRow[]>();
  if (error) throw error;
  return data.map(mapKeepInMindItem);
}
