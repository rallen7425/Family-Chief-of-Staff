import { describe, expect, it } from "vitest";
import { buildEntryRows, generateWeeklyDates } from "@/lib/events/recurrence";
import type { EntryInput } from "@/lib/types";

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

const baseInput: EntryInput = {
  kind: "event",
  title: "Tumbling",
  subjectMemberId: "nora",
  ownerMemberIds: ["nora"],
  scope: "family",
  busyStatus: "busy",
  isCritical: false,
  location: "  Gym  ",
  notes: "",
  startsAt: "2026-05-01T14:00:00.000Z",
  allDay: false,
};

describe("buildEntryRows — one-off", () => {
  it("emits a single row, passing startsAt through untouched and no recurrence id", () => {
    const rows = buildEntryRows({ input: baseInput, sourceType: "manual" });
    expect(rows).toHaveLength(1);
    expect(rows[0].starts_at).toBe("2026-05-01T14:00:00.000Z");
    expect(rows[0].recurrence_id).toBeNull();
    expect(rows[0].source_type).toBe("manual");
    expect(rows[0].status).toBe("confirmed");
    expect(rows[0].kind).toBe("event");
  });

  it("trims location and nulls out empty strings", () => {
    const [row] = buildEntryRows({ input: baseInput, sourceType: "manual" });
    expect(row.location_text).toBe("Gym");
    expect(row.notes).toBeNull();
  });

  it("threads arrival through on the one-off path", () => {
    const [row] = buildEntryRows({
      input: { ...baseInput, arrivalAt: "2026-05-01T13:00:00.000Z", arrivalSource: "inferred" },
      sourceType: "manual",
    });
    expect(row.arrival_at).toBe("2026-05-01T13:00:00.000Z");
    expect(row.arrival_source).toBe("inferred");
  });

  it("carries sourceDetail through for chat-originated entries", () => {
    const [row] = buildEntryRows({
      input: baseInput,
      sourceType: "chat",
      sourceDetail: { message: "add tumbling" },
    });
    expect(row.source_type).toBe("chat");
    expect(row.source_detail).toEqual({ message: "add tumbling" });
  });

  it("emits a task row with a due date and no start", () => {
    const [row] = buildEntryRows({
      input: {
        kind: "task",
        title: "Sign form",
        subjectMemberId: null,
        ownerMemberIds: [],
        scope: "family",
        busyStatus: "free",
        isCritical: false,
        allDay: false,
        dueAt: "2026-05-04",
      },
      sourceType: "manual",
    });
    expect(row.kind).toBe("task");
    expect(row.due_at).toBe("2026-05-04");
    expect(row.starts_at).toBeNull();
  });
});

describe("buildEntryRows — weekly recurrence", () => {
  const recurringInput: EntryInput = {
    ...baseInput,
    recurrence: {
      localDate: "2026-02-28",
      localStartTime: "09:00",
      untilDate: "2026-03-14",
    },
  };

  it("emits one row per weekly occurrence, all sharing one recurrence id", () => {
    const rows = buildEntryRows({ input: recurringInput, sourceType: "manual" });
    expect(rows).toHaveLength(3);
    const ids = new Set(rows.map((r) => r.recurrence_id));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows.every((r) => r.recurrence_until === "2026-03-14")).toBe(true);
  });

  it("recomputes each occurrence's UTC instant from its own local date, so a series crossing the spring-forward keeps 09:00 wall-clock", () => {
    const rows = buildEntryRows({ input: recurringInput, sourceType: "manual" });
    // Feb 28 + Mar 7 are EST (UTC-5) -> 14:00Z; Mar 14 is EDT (UTC-4) -> 13:00Z.
    expect(rows.map((r) => r.starts_at)).toEqual([
      "2026-02-28T14:00:00.000Z",
      "2026-03-07T14:00:00.000Z",
      "2026-03-14T13:00:00.000Z",
    ]);
  });

  it("uses local midnight for an all-day series (no start time)", () => {
    const rows = buildEntryRows({
      input: {
        ...baseInput,
        allDay: true,
        recurrence: { localDate: "2026-06-01", untilDate: "2026-06-08" },
      },
      sourceType: "manual",
    });
    expect(rows.map((r) => r.starts_at)).toEqual([
      "2026-06-01T04:00:00.000Z", // 00:00 EDT
      "2026-06-08T04:00:00.000Z",
    ]);
    expect(rows.every((r) => r.ends_at === null)).toBe(true);
  });
});
