"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

/** `kind` is retained for the client's grouping/labelling; the action
 * itself no longer needs it now that events and todos share one table. */
export interface ReviewItemRef {
  id: string;
  kind: "event" | "todo";
}

function revalidateReviewViews() {
  revalidatePath("/review");
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/todo");
}

async function setStatus(items: ReviewItemRef[], status: "confirmed" | "dismissed"): Promise<void> {
  if (items.length === 0) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({ status, updated_at: new Date().toISOString() })
    .in(
      "id",
      items.map((item) => item.id)
    );
  if (error) throw error;
  revalidateReviewViews();
}

export async function approveReviewItems(items: ReviewItemRef[]): Promise<void> {
  await setStatus(items, "confirmed");
}

export async function removeReviewItems(items: ReviewItemRef[]): Promise<void> {
  await setStatus(items, "dismissed");
}
