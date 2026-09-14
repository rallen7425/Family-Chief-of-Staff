"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getGoalById } from "@/lib/data/goals";
import { requireHousehold } from "@/lib/actions/requireHousehold";
import {
  claimGoal as writeClaim,
  resolveGoalClaim as writeResolution,
  type ClaimResult,
} from "@/lib/chores";

function revalidateGoalViews() {
  revalidatePath("/");
  revalidatePath("/chores");
  revalidatePath("/chores/goals");
}

export interface GoalInput {
  name: string;
  pointsNeeded: number;
  needsApproval: boolean;
  active: boolean;
  /** Empty = available to every kid. */
  availableMemberIds: string[];
}

function validate(input: GoalInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (input.pointsNeeded < 1) return "Points needed must be at least 1.";
  return null;
}

async function syncAvailability(
  householdId: string,
  goalId: string,
  availableMemberIds: string[]
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("goal_availability").delete().eq("goal_id", goalId);
  const unique = [...new Set(availableMemberIds)];
  if (unique.length === 0) return;
  const { error } = await supabase
    .from("goal_availability")
    .insert(unique.map((family_member_id) => ({ goal_id: goalId, family_member_id, household_id: householdId })));
  if (error) throw error;
}

export async function createGoal(input: GoalInput): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const err = validate(input);
  if (err) return { error: err };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("goals")
    .insert({
      household_id: household.householdId,
      name: input.name.trim(),
      points_needed: input.pointsNeeded,
      needs_approval: input.needsApproval,
      active: input.active,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  try {
    await syncAvailability(household.householdId, data.id, input.availableMemberIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set availability." };
  }

  revalidateGoalViews();
  return {};
}

export async function updateGoal(id: string, input: GoalInput): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const err = validate(input);
  if (err) return { error: err };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("goals")
    .update({
      name: input.name.trim(),
      points_needed: input.pointsNeeded,
      needs_approval: input.needsApproval,
      active: input.active,
    })
    .eq("id", id)
    .eq("household_id", household.householdId);
  if (error) return { error: error.message };

  try {
    await syncAvailability(household.householdId, id, input.availableMemberIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set availability." };
  }

  revalidateGoalViews();
  return {};
}

/** Blocked while a pending claim references this goal — a pending claim
 * against a deleted goal would be confusing for the parent reviewing it. */
export async function deleteGoal(id: string): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from("goal_claims")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", id)
    .eq("status", "pending");
  if (countError) return { error: countError.message };
  if (count && count > 0) {
    return { error: "This goal has a pending request — resolve it before deleting." };
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("household_id", household.householdId);
  if (error) return { error: error.message };
  revalidateGoalViews();
  return {};
}

export async function claimGoalAction(
  goalId: string,
  familyMemberId: string
): Promise<ClaimResult | { error: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const goal = await getGoalById(household.householdId, goalId);
  if (!goal) return { error: "This goal no longer exists." };
  const result = await writeClaim(household.householdId, goalId, familyMemberId, goal.pointsNeeded, goal.needsApproval);
  revalidateGoalViews();
  return result;
}

export async function resolveGoalClaimAction(
  claimId: string,
  decision: "achieved" | "denied"
): Promise<{ error?: string }> {
  const household = await requireHousehold();
  if ("error" in household) return household;
  const result = await writeResolution(household.householdId, claimId, decision);
  revalidateGoalViews();
  return result;
}
