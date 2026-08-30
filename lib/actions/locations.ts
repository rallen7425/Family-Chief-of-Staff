"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

/** Updates the household "Home" address (the member_locations row with
 * family_member_id IS NULL, label = 'Home'). Geocoding is a later phase. */
export async function updateHomeAddress(address: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("member_locations")
    .update({ address: address.trim() || null, updated_at: new Date().toISOString() })
    .is("family_member_id", null)
    .eq("label", "Home");
  if (error) return { error: error.message };
  revalidatePath("/family");
  return {};
}
