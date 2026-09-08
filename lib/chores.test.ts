import { describe, it, expect } from "vitest";
import {
  choreOccursOn,
  occurrencesToday,
  todaysOccurrences,
  isEligibleTimeWindow,
  isSchoolHours,
  pickRightNowChore,
  pointsForCompletion,
  crossedMilestone,
} from "@/lib/chores";
import type { Chore, ChoreCompletion } from "@/lib/types";

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: "c1",
    title: "Test chore",
    points: 10,
    frequency: "daily",
    timeWindow: "anytime",
    isPinned: false,
    active: true,
    assigneeMemberIds: ["m1"],
    createdAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeCompletion(overrides: Partial<ChoreCompletion> = {}): ChoreCompletion {
  return {
    id: "comp1",
    choreId: "c1",
    familyMemberId: "m1",
    completedOn: "2026-09-08",
    status: "complete",
    pointsAwarded: 10,
    completedAt: "2026-09-08T12:00:00Z",
    ...overrides,
  };
}

// A Tuesday.
const TUESDAY = new Date("2026-09-08T10:00:00");
// A Saturday.
const SATURDAY = new Date("2026-09-05T10:00:00");

describe("choreOccursOn", () => {
  it("daily and one_time occur every day", () => {
    expect(choreOccursOn(makeChore({ frequency: "daily" }), TUESDAY)).toBe(true);
    expect(choreOccursOn(makeChore({ frequency: "one_time" }), TUESDAY)).toBe(true);
  });

  it("weekly/custom only occur on their frequencyDays", () => {
    const tuesdayOnly = makeChore({ frequency: "weekly", frequencyDays: [2] });
    expect(choreOccursOn(tuesdayOnly, TUESDAY)).toBe(true);
    expect(choreOccursOn(tuesdayOnly, SATURDAY)).toBe(false);
  });
});

describe("occurrencesToday / todaysOccurrences", () => {
  it("a one_time chore drops out entirely once completed on a prior day", () => {
    const chore = makeChore({ frequency: "one_time" });
    const completions = [makeCompletion({ completedOn: "2026-09-07" })];
    expect(occurrencesToday([chore], completions, TUESDAY)).toEqual([]);
  });

  it("a one_time chore still counts as today's occurrence if completed today", () => {
    const chore = makeChore({ frequency: "one_time" });
    const completions = [makeCompletion({ completedOn: "2026-09-08" })];
    expect(occurrencesToday([chore], completions, TUESDAY).map((c) => c.id)).toEqual(["c1"]);
    // But it's not "remaining" — already done today.
    expect(todaysOccurrences([chore], completions, TUESDAY)).toEqual([]);
  });

  it("a daily chore completed today is done, but still recurs tomorrow", () => {
    const chore = makeChore({ frequency: "daily" });
    const completions = [makeCompletion({ completedOn: "2026-09-08" })];
    expect(todaysOccurrences([chore], completions, TUESDAY)).toEqual([]);
    expect(occurrencesToday([chore], completions, TUESDAY).map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("isEligibleTimeWindow", () => {
  it("before_school is only before 7:00a", () => {
    expect(isEligibleTimeWindow("before_school", 6 * 60)).toBe(true);
    expect(isEligibleTimeWindow("before_school", 7 * 60)).toBe(false);
  });

  it("after_school is 3:00-6:00p", () => {
    expect(isEligibleTimeWindow("after_school", 15 * 60)).toBe(true);
    expect(isEligibleTimeWindow("after_school", 17 * 60 + 59)).toBe(true);
    expect(isEligibleTimeWindow("after_school", 18 * 60)).toBe(false);
    expect(isEligibleTimeWindow("after_school", 14 * 60)).toBe(false);
  });

  it("evening is 6:00-9:00p", () => {
    expect(isEligibleTimeWindow("evening", 18 * 60)).toBe(true);
    expect(isEligibleTimeWindow("evening", 21 * 60)).toBe(false);
  });

  it("anytime is always eligible", () => {
    expect(isEligibleTimeWindow("anytime", 0)).toBe(true);
    expect(isEligibleTimeWindow("anytime", 23 * 60)).toBe(true);
  });
});

describe("isSchoolHours", () => {
  it("true on a weekday between 7:00a and 3:00p", () => {
    expect(isSchoolHours(new Date("2026-09-08T10:00:00"))).toBe(true);
    expect(isSchoolHours(new Date("2026-09-08T06:59:00"))).toBe(false);
    expect(isSchoolHours(new Date("2026-09-08T15:00:00"))).toBe(false);
  });

  it("false on a weekend regardless of time", () => {
    expect(isSchoolHours(new Date("2026-09-05T10:00:00"))).toBe(false);
  });
});

describe("pickRightNowChore", () => {
  it("returns null for an empty list", () => {
    expect(pickRightNowChore([], { remainingToday: 0, currentStreak: 0 })).toBeNull();
  });

  it("a pinned chore wins outright over deadline and points", () => {
    const pinned = makeChore({ id: "pinned", isPinned: true, points: 1 });
    const unpinnedHighValue = makeChore({ id: "big", isPinned: false, points: 100, deadlineTime: "08:00" });
    const result = pickRightNowChore([unpinnedHighValue, pinned], { remainingToday: 2, currentStreak: 0 });
    expect(result?.id).toBe("pinned");
  });

  it("un-pinning falls through to nearest deadline, then points", () => {
    const noDeadline = makeChore({ id: "none", points: 50 });
    const laterDeadline = makeChore({ id: "later", deadlineTime: "18:00", points: 5 });
    const earlierDeadline = makeChore({ id: "earlier", deadlineTime: "08:00", points: 5 });
    const result = pickRightNowChore([noDeadline, laterDeadline, earlierDeadline], {
      remainingToday: 3,
      currentStreak: 0,
    });
    expect(result?.id).toBe("earlier");
  });

  it("ties on deadline fall through to highest points", () => {
    const low = makeChore({ id: "low", points: 5 });
    const high = makeChore({ id: "high", points: 20 });
    const result = pickRightNowChore([low, high], { remainingToday: 2, currentStreak: 0 });
    expect(result?.id).toBe("high");
  });
});

describe("pointsForCompletion", () => {
  it("full credit for complete, half (rounded) for partial", () => {
    const chore = makeChore({ points: 11 });
    expect(pointsForCompletion(chore, "complete")).toBe(11);
    expect(pointsForCompletion(chore, "partial")).toBe(6); // round(5.5)
  });
});

describe("crossedMilestone", () => {
  it("fires on a streak that's a multiple of 5", () => {
    expect(crossedMilestone({ balance: 0, currentStreak: 4 }, { balance: 10, currentStreak: 5 })).toBe(true);
    expect(crossedMilestone({ balance: 0, currentStreak: 5 }, { balance: 20, currentStreak: 6 })).toBe(false);
  });

  it("fires on crossing a 100-point boundary", () => {
    expect(crossedMilestone({ balance: 95, currentStreak: 1 }, { balance: 105, currentStreak: 2 })).toBe(true);
    expect(crossedMilestone({ balance: 105, currentStreak: 2 }, { balance: 115, currentStreak: 3 })).toBe(false);
  });

  it("doesn't fire on an ordinary completion", () => {
    expect(crossedMilestone({ balance: 10, currentStreak: 1 }, { balance: 20, currentStreak: 2 })).toBe(false);
  });
});
