import { describe, expect, it } from "vitest";
import { buildSchedulePreview } from "@/lib/schedulePreview";
import type { CalendarEvent } from "@/lib/types";

// 2026-08-29 14:00 machine-local. All fixtures are built as offsets from
// this, so the test is internally consistent regardless of the runner's TZ.
const NOW = new Date("2026-08-29T18:00:00.000Z");
const H = 60 * 60 * 1000;

let seq = 0;
function mkEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `e${seq++}`,
    title: "Thing",
    kind: "event",
    familyMemberId: null,
    ownerMemberIds: [],
    scope: "family",
    busyStatus: "free",
    allDay: false,
    isCritical: false,
    status: "confirmed",
    sourceType: "manual",
    startsAt: new Date(NOW.getTime() + 2 * H).toISOString(),
    createdAt: new Date(NOW.getTime() - 24 * H).toISOString(),
    ...over,
  };
}
const at = (h: number, over: Partial<CalendarEvent> = {}) =>
  mkEvent({ startsAt: new Date(NOW.getTime() + h * H).toISOString(), ...over });

describe("buildSchedulePreview", () => {
  it("shows only today, no look-ahead, when today has more than 2 remaining", () => {
    const r = buildSchedulePreview([at(1), at(2), at(3), at(26)], NOW);
    expect(r.tomorrow).toBeNull();
    expect(r.today).toHaveLength(3);
    expect(r.emptyThroughDayAfter).toBe(false);
  });

  it("also shows tomorrow when today has 2 or fewer", () => {
    const r = buildSchedulePreview([at(1), at(2), at(26), at(28)], NOW);
    expect(r.today).toHaveLength(2);
    expect(r.tomorrow).toHaveLength(2);
  });

  it("today empty + tomorrow has events → today message, tomorrow list", () => {
    const r = buildSchedulePreview([at(26), at(30)], NOW);
    expect(r.today).toEqual([]);
    expect(r.tomorrow).toHaveLength(2);
    expect(r.emptyThroughDayAfter).toBe(false);
  });

  it("today + tomorrow empty but the day after has events → both empty, not collapsed", () => {
    const r = buildSchedulePreview([at(50)], NOW);
    expect(r.today).toEqual([]);
    expect(r.tomorrow).toEqual([]);
    expect(r.emptyThroughDayAfter).toBe(false);
  });

  it("today + tomorrow + day after all empty → collapse flag", () => {
    const r = buildSchedulePreview([], NOW);
    expect(r.emptyThroughDayAfter).toBe(true);
    expect(r.today).toEqual([]);
    expect(r.tomorrow).toEqual([]);
  });

  it("one event today, nothing tomorrow → tomorrow is an empty list (still looked ahead)", () => {
    const r = buildSchedulePreview([at(2)], NOW);
    expect(r.today).toHaveLength(1);
    expect(r.tomorrow).toEqual([]);
    expect(r.emptyThroughDayAfter).toBe(false);
  });

  describe("today filtering — an entry stays until it ends", () => {
    it("drops a today entry that has already ended", () => {
      const r = buildSchedulePreview(
        [at(-3, { endsAt: new Date(NOW.getTime() - 1 * H).toISOString() })],
        NOW
      );
      expect(r.today).toEqual([]);
    });
    it("keeps a today entry that started but has no end time (runs through the day)", () => {
      const r = buildSchedulePreview([at(-1)], NOW);
      expect(r.today).toHaveLength(1);
    });
    it("keeps an all-day entry for today", () => {
      const r = buildSchedulePreview([at(-5, { allDay: true })], NOW);
      expect(r.today).toHaveLength(1);
    });
  });

  describe("caps", () => {
    it("caps today at 4", () => {
      const r = buildSchedulePreview([at(1), at(1.5), at(2), at(2.5), at(3), at(3.5)], NOW);
      expect(r.today).toHaveLength(4);
      expect(r.tomorrow).toBeNull();
    });
    it("caps tomorrow at 3", () => {
      const r = buildSchedulePreview([at(1), at(26), at(27), at(28), at(29), at(30)], NOW);
      expect(r.today).toHaveLength(1);
      expect(r.tomorrow).toHaveLength(3);
    });
  });
});
