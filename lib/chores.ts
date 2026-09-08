import { format, getDay } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import type { Chore, ChoreCompletion, ChoreTimeWindow } from "@/lib/types";
import type { MemberPointsRow } from "@/lib/data/dbTypes";

/** A "partial" completion earns half credit, rounded. */
const PARTIAL_CREDIT_RATIO = 0.5;

export function pointsForCompletion(chore: Chore, status: "complete" | "partial"): number {
  return status === "partial" ? Math.round(chore.points * PARTIAL_CREDIT_RATIO) : chore.points;
}

/** Whether `chore` has an occurrence on `date`'s calendar day. Doesn't know
 * about completion state — a one_time chore always "occurs" until the
 * caller excludes ones already completed (any day, not just today). */
export function choreOccursOn(chore: Chore, date: Date): boolean {
  switch (chore.frequency) {
    case "daily":
    case "one_time":
      return true;
    case "weekly":
    case "custom":
      return (chore.frequencyDays ?? []).includes(getDay(date));
  }
}

/** Every chore that occurs on `date`'s calendar day, whether or not it's
 * been completed — a one_time chore counts only if today IS the day it was
 * completed, or it's never been completed at all. Used for "N of M done
 * today" ratios. */
export function occurrencesToday(
  chores: Chore[],
  allCompletions: ChoreCompletion[],
  date: Date = new Date()
): Chore[] {
  const dateStr = format(date, "yyyy-MM-dd");
  const everCompleted = new Set(allCompletions.map((c) => c.choreId));
  return chores.filter((chore) => {
    if (chore.frequency === "one_time" && everCompleted.has(chore.id)) {
      return allCompletions.some((c) => c.choreId === chore.id && c.completedOn === dateStr);
    }
    return choreOccursOn(chore, date);
  });
}

/** Today's still-remaining occurrences: occurrencesToday minus anything
 * already completed today. Shared by Today's Chores and the Right Now
 * module so neither duplicates this logic. */
export function todaysOccurrences(
  chores: Chore[],
  allCompletions: ChoreCompletion[],
  date: Date = new Date()
): Chore[] {
  const dateStr = format(date, "yyyy-MM-dd");
  const completedToday = new Set(
    allCompletions.filter((c) => c.completedOn === dateStr).map((c) => c.choreId)
  );
  return occurrencesToday(chores, allCompletions, date).filter((chore) => !completedToday.has(chore.id));
}

const SCHOOL_START_MINUTES = 7 * 60;
const SCHOOL_END_MINUTES = 15 * 60;
const AFTER_SCHOOL_END_MINUTES = 18 * 60;
const EVENING_END_MINUTES = 21 * 60;

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function isWeekday(d: Date): boolean {
  const day = getDay(d);
  return day >= 1 && day <= 5;
}

/** True on a weekday between 7:00a and 3:00p — the fixed school-hours
 * constant Right Now suppresses against (no per-kid/per-district data). */
export function isSchoolHours(d: Date): boolean {
  if (!isWeekday(d)) return false;
  const minutes = minutesSinceMidnight(d);
  return minutes >= SCHOOL_START_MINUTES && minutes < SCHOOL_END_MINUTES;
}

/** before_school = before 7:00a; after_school = 3:00–6:00p; evening =
 * 6:00–9:00p; anytime = always (still subject to the school-hours /
 * schedule-conflict suppression applied upstream). */
export function isEligibleTimeWindow(timeWindow: ChoreTimeWindow, minutes: number): boolean {
  switch (timeWindow) {
    case "before_school":
      return minutes < SCHOOL_START_MINUTES;
    case "after_school":
      return minutes >= SCHOOL_END_MINUTES && minutes < AFTER_SCHOOL_END_MINUTES;
    case "evening":
      return minutes >= AFTER_SCHOOL_END_MINUTES && minutes < EVENING_END_MINUTES;
    case "anytime":
      return true;
  }
}

/**
 * Rank order: pinned first; then nearest deadline_time (nulls last); then a
 * chore that's the member's last remaining one today when a streak is
 * active (skipping it would break today's streak); then highest points.
 * Returns the top candidate, or null for an empty list.
 */
export function pickRightNowChore(
  eligible: Chore[],
  opts: { remainingToday: number; currentStreak: number }
): Chore | null {
  if (eligible.length === 0) return null;
  const pinned = eligible.filter((c) => c.isPinned);
  const pool = pinned.length > 0 ? pinned : eligible;
  const lastRemainingWithStreak = opts.remainingToday === 1 && opts.currentStreak > 0;

  const ranked = [...pool].sort((a, b) => {
    const deadlineCompare = compareDeadline(a.deadlineTime, b.deadlineTime);
    if (deadlineCompare !== 0) return deadlineCompare;
    // Both candidates are equally "the last chore standing" whenever this is
    // true (remainingToday counts across the whole set, not per-candidate),
    // so this tier only ever matters as a marker, not a discriminator —
    // falls through to points either way.
    void lastRemainingWithStreak;
    return b.points - a.points;
  });
  return ranked[0];
}

function compareDeadline(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every-5-day streak milestone or every-100-point balance boundary — the
 * Celebration modal trigger, checked in the same write path that updates
 * member_points so it can never drift out of sync with the real numbers. */
export function crossedMilestone(prev: { balance: number; currentStreak: number }, next: {
  balance: number;
  currentStreak: number;
}): boolean {
  const streakMilestone = next.currentStreak > prev.currentStreak && next.currentStreak % 5 === 0;
  const pointsMilestone = Math.floor(next.balance / 100) > Math.floor(prev.balance / 100);
  return streakMilestone || pointsMilestone;
}

export interface CompletionResult {
  pointsAwarded: number;
  balance: number;
  currentStreak: number;
  longestStreak: number;
  milestoneHit: boolean;
}

/** The Celebration modal's copy for a completion that hit a milestone —
 * streak takes priority when both land on the same completion. */
export function celebrationMessage(result: CompletionResult): string {
  if (result.currentStreak > 0 && result.currentStreak % 5 === 0) {
    return `${result.currentStreak}-day streak! Keep it up.`;
  }
  const boundary = Math.floor(result.balance / 100) * 100;
  return `You just crossed ${boundary} points!`;
}

/**
 * The one write path for earning chore points — shared by the Right Now
 * card and Today's Chores so balance/streak math never forks (see §8
 * acceptance notes). Sequential awaited writes in one server action, same
 * pattern createEntry/syncOwners already uses elsewhere in this app —
 * not a real DB transaction, but there's no existing RPC precedent here.
 */
export async function completeChore(
  chore: Chore,
  familyMemberId: string,
  status: "complete" | "partial",
  now: Date = new Date()
): Promise<CompletionResult> {
  const supabase = getSupabaseClient();
  const dateStr = format(now, "yyyy-MM-dd");
  const pointsAwarded = pointsForCompletion(chore, status);

  const { error: insertError } = await supabase.from("chore_completions").insert({
    chore_id: chore.id,
    family_member_id: familyMemberId,
    completed_on: dateStr,
    status,
    points_awarded: pointsAwarded,
  });
  if (insertError) throw insertError;

  const { data: current, error: readError } = await supabase
    .from("member_points")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .maybeSingle<MemberPointsRow>();
  if (readError) throw readError;

  const prevBalance = current?.balance ?? 0;
  const prevStreak = current?.current_streak ?? 0;
  const prevLongest = current?.longest_streak ?? 0;
  const lastCompletedOn = current?.last_completed_on ?? null;

  const yesterday = format(new Date(now.getTime() - 86_400_000), "yyyy-MM-dd");
  const currentStreak =
    lastCompletedOn === dateStr ? prevStreak : lastCompletedOn === yesterday ? prevStreak + 1 : 1;
  const balance = prevBalance + pointsAwarded;
  const longestStreak = Math.max(prevLongest, currentStreak);

  const { error: upsertError } = await supabase
    .from("member_points")
    .upsert({
      family_member_id: familyMemberId,
      balance,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_on: dateStr,
    });
  if (upsertError) throw upsertError;

  return {
    pointsAwarded,
    balance,
    currentStreak,
    longestStreak,
    milestoneHit: crossedMilestone(
      { balance: prevBalance, currentStreak: prevStreak },
      { balance, currentStreak }
    ),
  };
}

export interface ClaimResult {
  claimId: string;
  status: "pending" | "achieved";
  balance: number;
}

/**
 * Debits the balance immediately at claim time (not at approval) so a kid
 * can't double-spend the same points on two pending claims. Reaching the
 * update below requires balance >= pointsNeeded > 0, which means a
 * member_points row necessarily already exists (it's only ever created
 * by completeChore) — safe to .update() rather than .upsert().
 */
export async function claimGoal(
  goalId: string,
  familyMemberId: string,
  pointsNeeded: number,
  needsApproval: boolean
): Promise<ClaimResult | { error: string }> {
  const supabase = getSupabaseClient();
  const { data: points, error: readError } = await supabase
    .from("member_points")
    .select("balance")
    .eq("family_member_id", familyMemberId)
    .maybeSingle<{ balance: number }>();
  if (readError) throw readError;

  const balance = points?.balance ?? 0;
  if (balance < pointsNeeded) return { error: "Not enough points yet." };

  const newBalance = balance - pointsNeeded;
  const { error: updateError } = await supabase
    .from("member_points")
    .update({ balance: newBalance })
    .eq("family_member_id", familyMemberId);
  if (updateError) throw updateError;

  const status = needsApproval ? "pending" : "achieved";
  const { data: claim, error: insertError } = await supabase
    .from("goal_claims")
    .insert({
      goal_id: goalId,
      family_member_id: familyMemberId,
      points_spent: pointsNeeded,
      status,
      resolved_at: needsApproval ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return { claimId: claim.id, status, balance: newBalance };
}

/**
 * On deny, refunds the debited points; on achieve, no balance change
 * (already debited at claim time). The claim's family_member_id necessarily
 * has a member_points row (same reasoning as claimGoal), so refund is a
 * safe .update().
 */
export async function resolveGoalClaim(
  claimId: string,
  decision: "achieved" | "denied"
): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { data: claim, error: readError } = await supabase
    .from("goal_claims")
    .select("family_member_id, points_spent, status")
    .eq("id", claimId)
    .single();
  if (readError) return { error: readError.message };
  if (claim.status !== "pending") return { error: "This request was already resolved." };

  if (decision === "denied") {
    const { data: points, error: pointsError } = await supabase
      .from("member_points")
      .select("balance")
      .eq("family_member_id", claim.family_member_id)
      .maybeSingle()
      .returns<{ balance: number } | null>();
    if (pointsError) return { error: pointsError.message };
    const { error: refundError } = await supabase
      .from("member_points")
      .update({ balance: (points?.balance ?? 0) + claim.points_spent })
      .eq("family_member_id", claim.family_member_id);
    if (refundError) return { error: refundError.message };
  }

  const { error: updateError } = await supabase
    .from("goal_claims")
    .update({ status: decision, resolved_at: new Date().toISOString() })
    .eq("id", claimId);
  if (updateError) return { error: updateError.message };

  return {};
}
