"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getChoreById } from "@/lib/data/chores";
import { completeChore as writeCompletion, type CompletionResult } from "@/lib/chores";
import type { ChoreFrequency, ChoreTimeWindow } from "@/lib/types";

function revalidateChoreViews() {
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/chores/progress");
  revalidatePath("/chores/leaderboard");
}

export interface ChoreInput {
  title: string;
  points: number;
  frequency: ChoreFrequency;
  frequencyDays?: number[] | null;
  deadlineTime?: string | null;
  timeWindow: ChoreTimeWindow;
  isPinned: boolean;
  active: boolean;
  assigneeMemberIds: string[];
}

function validate(input: ChoreInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (input.points < 1) return "Points must be at least 1.";
  if (input.assigneeMemberIds.length === 0) return "Assign this chore to at least one kid.";
  if (
    (input.frequency === "weekly" || input.frequency === "custom") &&
    (!input.frequencyDays || input.frequencyDays.length === 0)
  ) {
    return "Pick at least one day.";
  }
  return null;
}

async function syncAssignees(choreId: string, assigneeMemberIds: string[]): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("chore_assignees").delete().eq("chore_id", choreId);
  const unique = [...new Set(assigneeMemberIds)];
  if (unique.length === 0) return;
  const { error } = await supabase
    .from("chore_assignees")
    .insert(unique.map((family_member_id) => ({ chore_id: choreId, family_member_id })));
  if (error) throw error;
}

export async function createChore(input: ChoreInput): Promise<{ error?: string }> {
  const err = validate(input);
  if (err) return { error: err };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chores")
    .insert({
      title: input.title.trim(),
      points: input.points,
      frequency: input.frequency,
      frequency_days: input.frequency === "weekly" || input.frequency === "custom" ? input.frequencyDays : null,
      deadline_time: input.deadlineTime || null,
      time_window: input.timeWindow,
      is_pinned: input.isPinned,
      active: input.active,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  try {
    await syncAssignees(data.id, input.assigneeMemberIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign this chore." };
  }

  revalidateChoreViews();
  return {};
}

export async function updateChore(id: string, input: ChoreInput): Promise<{ error?: string }> {
  const err = validate(input);
  if (err) return { error: err };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("chores")
    .update({
      title: input.title.trim(),
      points: input.points,
      frequency: input.frequency,
      frequency_days: input.frequency === "weekly" || input.frequency === "custom" ? input.frequencyDays : null,
      deadline_time: input.deadlineTime || null,
      time_window: input.timeWindow,
      is_pinned: input.isPinned,
      active: input.active,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  try {
    await syncAssignees(id, input.assigneeMemberIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign this chore." };
  }

  revalidateChoreViews();
  return {};
}

/** Hard delete — chore_assignees/chore_completions cascade. */
export async function deleteChore(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateChoreViews();
  return {};
}

/** The one entry point for earning chore points, used by both Today's
 * Chores and the Right Now card. */
export async function completeChoreAction(
  choreId: string,
  familyMemberId: string,
  status: "complete" | "partial"
): Promise<CompletionResult | { error: string }> {
  const chore = await getChoreById(choreId);
  if (!chore) return { error: "This chore no longer exists." };
  const result = await writeCompletion(chore, familyMemberId, status);
  revalidateChoreViews();
  return result;
}
