import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export interface HomeLocation {
  id: string;
  address: string | null;
}

/** The single household "Home" row in member_locations (family_member_id
 * IS NULL, label = 'Home') — seeded address-less by the P1 migration. */
export const getHomeLocation = cache(async (): Promise<HomeLocation | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_locations")
    .select("id, address")
    .is("family_member_id", null)
    .eq("label", "Home")
    .limit(1)
    .returns<HomeLocation[]>();
  if (error) throw error;
  return data[0] ?? null;
});
