import { startOfDay, endOfDay } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import { effectiveIsAdult } from "@/lib/family";
import { getActiveChoresForMember, getCompletionsForMember, getMemberPoints } from "@/lib/data/chores";
import {
  todaysOccurrences,
  isSchoolHours,
  isEligibleTimeWindow,
  minutesSinceMidnight,
  pickRightNowChore,
} from "@/lib/chores";
import type { FamilyMember, RightNowChore } from "@/lib/types";

interface BusyEventRow {
  starts_at: string;
  ends_at: string | null;
  arrival_at: string | null;
  subject_member_id: string | null;
  entry_owners: { family_member_id: string }[] | null;
}

/** True when `familyMemberId` is inside a scheduled event right now — from
 * its arrival-buffer window (if set) through its end (or, with no end, just
 * through its start — "getting ready to leave" still counts as busy). */
async function isMemberBusyNow(familyMemberId: string, now: Date): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("starts_at, ends_at, arrival_at, subject_member_id, entry_owners(family_member_id)")
    .eq("kind", "event")
    .neq("status", "dismissed")
    .gte("starts_at", startOfDay(now).toISOString())
    .lte("starts_at", endOfDay(now).toISOString())
    .returns<BusyEventRow[]>();
  if (error) throw error;

  const nowMs = now.getTime();
  return data.some((row) => {
    const isParticipant =
      row.subject_member_id === familyMemberId ||
      (row.entry_owners ?? []).some((o) => o.family_member_id === familyMemberId);
    if (!isParticipant) return false;
    const startMs = new Date(row.arrival_at ?? row.starts_at).getTime();
    const endMs = new Date(row.ends_at ?? row.starts_at).getTime();
    return nowMs >= startMs && nowMs <= endMs;
  });
}

/**
 * The Right Now module's single source of truth: at most one eligible,
 * bite-sized chore for this member, or null when nothing qualifies (the
 * card is fully absent, not an empty state — see RightNowCard).
 */
export async function getRightNowChore(
  member: FamilyMember,
  now: Date = new Date()
): Promise<RightNowChore | null> {
  // Adults never see a Right Now card, regardless of time.
  if (effectiveIsAdult(member)) return null;
  if (isSchoolHours(now)) return null;
  if (await isMemberBusyNow(member.id, now)) return null;

  const [chores, completions, points] = await Promise.all([
    getActiveChoresForMember(member.id),
    getCompletionsForMember(member.id),
    getMemberPoints(member.id),
  ]);

  const remainingToday = todaysOccurrences(chores, completions, now);
  if (remainingToday.length === 0) return null;

  const minutes = minutesSinceMidnight(now);
  const eligible = remainingToday.filter((c) => isEligibleTimeWindow(c.timeWindow, minutes));

  const top = pickRightNowChore(eligible, {
    remainingToday: remainingToday.length,
    currentStreak: points.currentStreak,
  });
  if (!top) return null;

  return {
    choreId: top.id,
    title: top.title,
    points: top.points,
    timeWindow: top.timeWindow,
    deadlineTime: top.deadlineTime ?? null,
  };
}
