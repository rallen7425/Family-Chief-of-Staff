"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { requireHousehold } from "@/lib/actions/requireHousehold";
import type { EntryKind } from "@/lib/types";

/** `kind` is retained for the client's grouping/labelling; the action
 * itself no longer needs it now that every kind shares one table. */
export interface ReviewItemRef {
  id: string;
  kind: EntryKind;
}

function revalidateReviewViews() {
  revalidatePath("/review");
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/todo");
}

async function setStatus(items: ReviewItemRef[], status: "confirmed" | "dismissed"): Promise<void> {
  if (items.length === 0) return;
  const household = await requireHousehold();
  if ("error" in household) throw new Error(household.error);
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({ status, updated_at: new Date().toISOString() })
    .in(
      "id",
      items.map((item) => item.id)
    )
    .eq("household_id", household.householdId);
  if (error) throw error;
  revalidateReviewViews();
}

export async function approveReviewItems(items: ReviewItemRef[]): Promise<void> {
  await setStatus(items, "confirmed");
}

export async function removeReviewItems(items: ReviewItemRef[]): Promise<void> {
  await setStatus(items, "dismissed");
}
