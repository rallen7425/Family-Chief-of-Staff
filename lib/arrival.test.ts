import { describe, expect, it } from "vitest";
import { inferArrivalAt, matchArrivalRule, describeArrivalRule, type ArrivalBufferRule } from "@/lib/arrival";

const rules: ArrivalBufferRule[] = [
  { id: "gen", category: null, appliesToKidsOnly: true, bufferMinutes: 15 },
  { id: "game", category: "game", appliesToKidsOnly: true, bufferMinutes: 60 },
];

const kidEvent = {
  kind: "event" as const,
  startsAt: "2026-09-01T20:00:00.000Z", // 4:00 PM ET
  subjectMemberId: "ben",
  subjectIsAdult: false,
};

describe("matchArrivalRule", () => {
  it("exact category match wins over the general default", () => {
    expect(matchArrivalRule({ ...kidEvent, category: "game" }, rules)?.id).toBe("game");
  });

  it("falls back to the general rule for an uncategorised kid's event", () => {
    expect(matchArrivalRule({ ...kidEvent, category: null }, rules)?.id).toBe("gen");
    expect(matchArrivalRule({ ...kidEvent, category: "practice" }, rules)?.id).toBe("gen");
  });

  it("no rule for an adult subject", () => {
    expect(matchArrivalRule({ ...kidEvent, subjectIsAdult: true, category: "game" }, rules)).toBeNull();
  });

  it("no rule for a whole-family entry", () => {
    expect(matchArrivalRule({ ...kidEvent, subjectMemberId: null, category: "game" }, rules)).toBeNull();
  });

  it("no rule for non-event kinds", () => {
    expect(matchArrivalRule({ ...kidEvent, kind: "task", category: "game" }, rules)).toBeNull();
  });
});

describe("inferArrivalAt", () => {
  it("subtracts 60 min for a kid's game", () => {
    expect(inferArrivalAt({ ...kidEvent, category: "game" }, rules)).toBe("2026-09-01T19:00:00.000Z");
  });

  it("subtracts the 15-min general default otherwise", () => {
    expect(inferArrivalAt({ ...kidEvent, category: null }, rules)).toBe("2026-09-01T19:45:00.000Z");
  });

  it("returns null with no start time", () => {
    expect(inferArrivalAt({ ...kidEvent, startsAt: null, category: "game" }, rules)).toBeNull();
  });
});

describe("describeArrivalRule", () => {
  it("names the category default", () => {
    expect(describeArrivalRule(rules[1])).toBe("Auto · 60 min early (game default)");
  });
  it("names the general default", () => {
    expect(describeArrivalRule(rules[0])).toBe("Auto · 15 min early (kids' activity default)");
  });
});
