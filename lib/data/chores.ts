import { cache } from "react";
import { format } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import type { Chore, ChoreCompletion, MemberPoints } from "@/lib/types";
import type { ChoreRow, ChoreCompletionRow, MemberPointsRow } from "@/lib/data/dbTypes";

type ChoreRowWithAssignees = ChoreRow & { chore_assignees: { family_member_id: string }[] | null };

const SELECT_WITH_ASSIGNEES = "*, chore_assignees(family_member_id)";

function mapChore(row: ChoreRowWithAssignees): Chore {
  return {
    id: row.id,
    title: row.title,
    points: row.points,
    frequency: row.frequency,
    frequencyDays: row.frequency_days ?? undefined,
    deadlineTime: row.deadline_time ?? undefined,
    timeWindow: row.time_window,
    isPinned: row.is_pinned,
    active: row.active,
    assigneeMemberIds: (row.chore_assignees ?? []).map((a) => a.family_member_id),
    createdAt: row.created_at,
  };
}

/** Wrapped in cache() since the Parent Dashboard, Chore Builder, and Today's
 * Chores can all need the full catalog within one request. */
export const getChores = cache(async (): Promise<Chore[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chores")
    .select(SELECT_WITH_ASSIGNEES)
    .order("created_at")
    .returns<ChoreRowWithAssignees[]>();
  if (error) throw error;
  return data.map(mapChore);
});

export async function getChoreById(id: string): Promise<Chore | null> {
  const chores = await getChores();
  return chores.find((c) => c.id === id) ?? null;
}

export async function getActiveChoresForMember(familyMemberId: string): Promise<Chore[]> {
  const chores = await getChores();
  return chores.filter((c) => c.active && c.assigneeMemberIds.includes(familyMemberId));
}

function mapCompletion(row: ChoreCompletionRow): ChoreCompletion {
  return {
    id: row.id,
    choreId: row.chore_id,
    familyMemberId: row.family_member_id,
    completedOn: row.completed_on,
    status: row.status,
    pointsAwarded: row.points_awarded,
    completedAt: row.completed_at,
  };
}

/** Every completion this member has ever recorded — used both to know
 * what's done today and (for one_time chores) whether it's ever been done
 * at all. A household's chore history is small enough that fetching it in
 * full is simpler than two narrower queries. */
export async function getCompletionsForMember(familyMemberId: string): Promise<ChoreCompletion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chore_completions")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .order("completed_on")
    .returns<ChoreCompletionRow[]>();
  if (error) throw error;
  return data.map(mapCompletion);
}

export async function getCompletionsSince(
  familyMemberId: string,
  sinceDate: string
): Promise<ChoreCompletion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chore_completions")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .gte("completed_on", sinceDate)
    .order("completed_on")
    .returns<ChoreCompletionRow[]>();
  if (error) throw error;
  return data.map(mapCompletion);
}

function mapMemberPoints(row: MemberPointsRow): MemberPoints {
  return {
    familyMemberId: row.family_member_id,
    balance: row.balance,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastCompletedOn: row.last_completed_on ?? undefined,
  };
}

function emptyPoints(familyMemberId: string): MemberPoints {
  return { familyMemberId, balance: 0, currentStreak: 0, longestStreak: 0, lastCompletedOn: undefined };
}

/** A member with no chore_completions yet has no member_points row —
 * treated as all-zeros rather than an error. */
export async function getMemberPoints(familyMemberId: string): Promise<MemberPoints> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_points")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .maybeSingle<MemberPointsRow>();
  if (error) throw error;
  return data ? mapMemberPoints(data) : emptyPoints(familyMemberId);
}

export async function getAllMemberPoints(familyMemberIds: string[]): Promise<MemberPoints[]> {
  if (familyMemberIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_points")
    .select("*")
    .in("family_member_id", familyMemberIds)
    .returns<MemberPointsRow[]>();
  if (error) throw error;
  const byId = new Map(data.map((r) => [r.family_member_id, mapMemberPoints(r)]));
  return familyMemberIds.map((id) => byId.get(id) ?? emptyPoints(id));
}

export function today(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}
