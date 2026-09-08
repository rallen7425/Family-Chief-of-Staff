import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Goal, GoalClaim } from "@/lib/types";
import type { GoalRow, GoalClaimRow } from "@/lib/data/dbTypes";

type GoalRowWithAvailability = GoalRow & { goal_availability: { family_member_id: string }[] | null };

const SELECT_WITH_AVAILABILITY = "*, goal_availability(family_member_id)";

function mapGoal(row: GoalRowWithAvailability): Goal {
  return {
    id: row.id,
    name: row.name,
    pointsNeeded: row.points_needed,
    needsApproval: row.needs_approval,
    active: row.active,
    availableMemberIds: (row.goal_availability ?? []).map((a) => a.family_member_id),
    createdAt: row.created_at,
  };
}

export const getGoals = cache(async (): Promise<Goal[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("goals")
    .select(SELECT_WITH_AVAILABILITY)
    .order("created_at")
    .returns<GoalRowWithAvailability[]>();
  if (error) throw error;
  return data.map(mapGoal);
});

export async function getGoalById(id: string): Promise<Goal | null> {
  const goals = await getGoals();
  return goals.find((g) => g.id === id) ?? null;
}

/** Empty `availableMemberIds` = available to every kid. */
export function isGoalAvailableTo(goal: Goal, familyMemberId: string): boolean {
  return goal.availableMemberIds.length === 0 || goal.availableMemberIds.includes(familyMemberId);
}

function mapClaim(row: GoalClaimRow): GoalClaim {
  return {
    id: row.id,
    goalId: row.goal_id,
    familyMemberId: row.family_member_id,
    pointsSpent: row.points_spent,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export async function getGoalClaimsForMember(familyMemberId: string): Promise<GoalClaim[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("goal_claims")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .order("requested_at", { ascending: false })
    .returns<GoalClaimRow[]>();
  if (error) throw error;
  return data.map(mapClaim);
}

/** Wrapped in cache() — the Parent Dashboard's pending-count strip and the
 * Parent Goals management queue both need this within one request. */
export const getPendingGoalClaims = cache(async (): Promise<GoalClaim[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("goal_claims")
    .select("*")
    .eq("status", "pending")
    .order("requested_at")
    .returns<GoalClaimRow[]>();
  if (error) throw error;
  return data.map(mapClaim);
});
