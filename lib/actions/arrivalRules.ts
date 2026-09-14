"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { requireHousehold } from "@/lib/actions/requireHousehold";

function clampBuffer(minutes: number): number {
  return Math.max(0, Math.min(180, Math.round(minutes)));
}

function revalidate() {
  revalidatePath("/settings/arrival");
}

export async function createArrivalRule(input: {
  category: string | null;
  bufferMinutes: number;
}): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const category = input.category?.trim() || null;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("arrival_buffer_rules").insert({
    household_id: household.householdId,
    category,
    applies_to_kids_only: true,
    buffer_minutes: clampBuffer(input.bufferMinutes),
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function updateArrivalRule(
  id: string,
  input: { category?: string | null; bufferMinutes?: number }
): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const patch: Record<string, unknown> = {};
  if (input.category !== undefined) patch.category = input.category?.trim() || null;
  if (input.bufferMinutes !== undefined) patch.buffer_minutes = clampBuffer(input.bufferMinutes);
  if (Object.keys(patch).length === 0) return {};

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("arrival_buffer_rules")
    .update(patch)
    .eq("id", id)
    .eq("household_id", household.householdId);
  if (error) return { error: error.message };
  revalidate();
  return {};
}

/** The general default (category IS NULL) is not removable — the UI hides
 * its delete control, and this guards the action too. */
export async function deleteArrivalRule(id: string): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const supabase = getSupabaseClient();
  const { data, error: readErr } = await supabase
    .from("arrival_buffer_rules")
    .select("category")
    .eq("id", id)
    .eq("household_id", household.householdId)
    .single();
  if (readErr) return { error: readErr.message };
  if (data?.category == null) return { error: "The general default can't be removed." };

  const { error } = await supabase
    .from("arrival_buffer_rules")
    .delete()
    .eq("id", id)
    .eq("household_id", household.householdId);
  if (error) return { error: error.message };
  revalidate();
  return {};
}
