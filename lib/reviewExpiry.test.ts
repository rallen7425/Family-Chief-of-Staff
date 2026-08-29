import { describe, expect, it } from "vitest";
import { isPastReviewEntry, dropPastReviewEntries, type ExpiryCheckable } from "@/lib/reviewExpiry";

// 2026-08-28 14:00 America/New_York — household "today" is 2026-08-28.
const NOW = new Date("2026-08-28T18:00:00.000Z");

describe("isPastReviewEntry — tasks", () => {
  it("is past when the due date is before today", () => {
    expect(isPastReviewEntry({ kind: "task", dueDate: "2026-08-27" }, NOW)).toBe(true);
  });

  it("is not past when due today", () => {
    expect(isPastReviewEntry({ kind: "task", dueDate: "2026-08-28" }, NOW)).toBe(false);
  });

  it("is not past when due in the future", () => {
    expect(isPastReviewEntry({ kind: "task", dueDate: "2026-09-01" }, NOW)).toBe(false);
  });

  it("never expires without a due date", () => {
    expect(isPastReviewEntry({ kind: "task" }, NOW)).toBe(false);
  });
});

describe("isPastReviewEntry — all-day schedule entries", () => {
  const allDay = (startsAt: string): ExpiryCheckable => ({ kind: "event", startsAt, allDay: true });

  it("is past when its calendar day is before today", () => {
    expect(isPastReviewEntry(allDay("2026-08-27T04:00:00.000Z"), NOW)).toBe(true);
  });

  it("is not past on its own day, even from the first minute", () => {
    expect(isPastReviewEntry(allDay("2026-08-28T04:00:00.000Z"), NOW)).toBe(false);
  });

  it("is not past for a future day", () => {
    expect(isPastReviewEntry(allDay("2026-08-30T04:00:00.000Z"), NOW)).toBe(false);
  });

  it("uses the household timezone, not UTC, for the day boundary", () => {
    // 2026-08-27 23:00 ET — household "today" is still the 27th, so an
    // all-day entry dated the 28th has not passed.
    const lateNight = new Date("2026-08-28T03:00:00.000Z");
    expect(isPastReviewEntry(allDay("2026-08-28T04:00:00.000Z"), lateNight)).toBe(false);
  });

  it("applies to advisories too", () => {
    expect(isPastReviewEntry({ kind: "advisory", startsAt: "2026-08-25T04:00:00.000Z", allDay: true }, NOW)).toBe(true);
  });
});

describe("isPastReviewEntry — timed schedule entries", () => {
  it("is past once the end time has gone by", () => {
    expect(
      isPastReviewEntry(
        { kind: "event", startsAt: "2026-08-28T12:00:00.000Z", endsAt: "2026-08-28T13:00:00.000Z", allDay: false },
        NOW
      )
    ).toBe(true);
  });

  it("stays until it ends when an end time is set", () => {
    expect(
      isPastReviewEntry(
        { kind: "event", startsAt: "2026-08-28T13:00:00.000Z", endsAt: "2026-08-28T21:00:00.000Z", allDay: false },
        NOW
      )
    ).toBe(false);
  });

  it("with no end time, is not past just because it has started — runs through its day", () => {
    expect(
      isPastReviewEntry({ kind: "event", startsAt: "2026-08-28T13:00:00.000Z", allDay: false }, NOW)
    ).toBe(false);
  });

  it("with no end time, is past once its day is over", () => {
    expect(
      isPastReviewEntry({ kind: "event", startsAt: "2026-08-27T13:00:00.000Z", allDay: false }, NOW)
    ).toBe(true);
  });

  it("is not past when it starts later today", () => {
    expect(
      isPastReviewEntry({ kind: "event", startsAt: "2026-08-28T22:00:00.000Z", allDay: false }, NOW)
    ).toBe(false);
  });

  it("applies to timed reminders", () => {
    expect(
      isPastReviewEntry({ kind: "reminder", startsAt: "2026-08-20T15:00:00.000Z", allDay: false }, NOW)
    ).toBe(true);
  });

  it("never expires a schedule entry with no date at all", () => {
    expect(isPastReviewEntry({ kind: "event", allDay: false }, NOW)).toBe(false);
  });
});

describe("dropPastReviewEntries", () => {
  it("keeps only the entries that haven't passed", () => {
    const entries: ExpiryCheckable[] = [
      { kind: "task", dueDate: "2026-08-01" }, // past
      { kind: "task", dueDate: "2026-09-15" }, // future
      { kind: "event", startsAt: "2026-08-27T13:00:00.000Z", allDay: false }, // past
      { kind: "event", startsAt: "2026-08-31T13:00:00.000Z", allDay: false }, // future
      { kind: "task" }, // no date — kept
    ];
    expect(dropPastReviewEntries(entries, NOW)).toEqual([
      { kind: "task", dueDate: "2026-09-15" },
      { kind: "event", startsAt: "2026-08-31T13:00:00.000Z", allDay: false },
      { kind: "task" },
    ]);
  });
});
