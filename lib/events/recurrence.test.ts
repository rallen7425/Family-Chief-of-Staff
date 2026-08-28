import { describe, expect, it } from "vitest";
import { buildEventRows, generateWeeklyDates, type EventInput } from "@/lib/events/recurrence";

describe("generateWeeklyDates", () => {
  it("steps weekly and includes the until date", () => {
    expect(generateWeeklyDates("2026-02-28", "2026-03-14")).toEqual([
      "2026-02-28",
      "2026-03-07",
      "2026-03-14",
    ]);
  });

  it("returns just the first date when until equals it", () => {
    expect(generateWeeklyDates("2026-05-01", "2026-05-01")).toEqual(["2026-05-01"]);
  });

  it("returns nothing when until is before the first date", () => {
    expect(generateWeeklyDates("2026-05-08", "2026-05-01")).toEqual([]);
  });
});

const baseInput: EventInput = {
  title: "Tumbling",
  familyMemberId: "nora",
  startsAt: "2026-05-01T14:00:00.000Z",
  allDay: false,
  location: "  Gym  ",
  notes: "",
};

describe("buildEventRows — one-off", () => {
  it("emits a single row, passing startsAt through untouched and no recurrence id", () => {
    const rows = buildEventRows({ title: "Tumbling", input: baseInput, sourceType: "manual" });
    expect(rows).toHaveLength(1);
    expect(rows[0].starts_at).toBe("2026-05-01T14:00:00.000Z");
    expect(rows[0].recurrence_id).toBeNull();
    expect(rows[0].source_type).toBe("manual");
    expect(rows[0].status).toBe("confirmed");
  });

  it("trims location and nulls out empty strings", () => {
    const [row] = buildEventRows({ title: "Tumbling", input: baseInput, sourceType: "manual" });
    expect(row.location).toBe("Gym");
    expect(row.notes).toBeNull();
  });

  it("carries sourceDetail through for chat-originated events", () => {
    const [row] = buildEventRows({
      title: "Tumbling",
      input: baseInput,
      sourceType: "chat",
      sourceDetail: { message: "add tumbling" },
    });
    expect(row.source_type).toBe("chat");
    expect(row.source_detail).toEqual({ message: "add tumbling" });
  });
});

describe("buildEventRows — weekly recurrence", () => {
  const recurringInput: EventInput = {
    ...baseInput,
    recurrence: {
      localDate: "2026-02-28",
      localStartTime: "09:00",
      untilDate: "2026-03-14",
    },
  };

  it("emits one row per weekly occurrence, all sharing one recurrence id", () => {
    const rows = buildEventRows({ title: "Tumbling", input: recurringInput, sourceType: "manual" });
    expect(rows).toHaveLength(3);
    const ids = new Set(rows.map((r) => r.recurrence_id));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("recomputes each occurrence's UTC instant from its own local date, so a series crossing the spring-forward keeps 09:00 wall-clock", () => {
    const rows = buildEventRows({ title: "Tumbling", input: recurringInput, sourceType: "manual" });
    // Feb 28 + Mar 7 are EST (UTC-5) -> 14:00Z; Mar 14 is EDT (UTC-4) -> 13:00Z.
    expect(rows.map((r) => r.starts_at)).toEqual([
      "2026-02-28T14:00:00.000Z",
      "2026-03-07T14:00:00.000Z",
      "2026-03-14T13:00:00.000Z",
    ]);
  });

  it("uses local midnight for an all-day series (no start time)", () => {
    const rows = buildEventRows({
      title: "Spirit week",
      input: { ...baseInput, allDay: true, recurrence: { localDate: "2026-06-01", untilDate: "2026-06-08" } },
      sourceType: "manual",
    });
    expect(rows.map((r) => r.starts_at)).toEqual([
      "2026-06-01T04:00:00.000Z", // 00:00 EDT
      "2026-06-08T04:00:00.000Z",
    ]);
    expect(rows.every((r) => r.ends_at === null)).toBe(true);
  });
});
