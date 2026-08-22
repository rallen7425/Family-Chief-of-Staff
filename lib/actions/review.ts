"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

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

function splitByKind(items: ReviewItemRef[]) {
  return {
    eventIds: items.filter((item) => item.kind === "event").map((item) => item.id),
    todoIds: items.filter((item) => item.kind === "todo").map((item) => item.id),
  };
}

export async function approveReviewItems(items: ReviewItemRef[]): Promise<void> {
  if (items.length === 0) return;
  const supabase = getSupabaseClient();
  const { eventIds, todoIds } = splitByKind(items);
  const updated_at = new Date().toISOString();

  if (eventIds.length > 0) {
    const { error } = await supabase
      .from("events")
      .update({ status: "confirmed", updated_at })
      .in("id", eventIds);
    if (error) throw error;
  }
  if (todoIds.length > 0) {
    const { error } = await supabase
      .from("todos")
      .update({ status: "confirmed", updated_at })
      .in("id", todoIds);
    if (error) throw error;
  }

  revalidateReviewViews();
}

export async function removeReviewItems(items: ReviewItemRef[]): Promise<void> {
  if (items.length === 0) return;
  const supabase = getSupabaseClient();
  const { eventIds, todoIds } = splitByKind(items);
  const updated_at = new Date().toISOString();

  if (eventIds.length > 0) {
    const { error } = await supabase
      .from("events")
      .update({ status: "dismissed", updated_at })
      .in("id", eventIds);
    if (error) throw error;
  }
  if (todoIds.length > 0) {
    const { error } = await supabase
      .from("todos")
      .update({ status: "dismissed", updated_at })
      .in("id", todoIds);
    if (error) throw error;
  }

  revalidateReviewViews();
}
