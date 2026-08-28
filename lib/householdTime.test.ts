import { describe, expect, it } from "vitest";
import { householdLocalToInstant } from "@/lib/householdTime";

// These assume the default household timezone (America/New_York); no
// HOUSEHOLD_TIMEZONE override is set in the test env.
describe("householdLocalToInstant", () => {
  it("resolves a winter (EST, UTC-5) wall-clock time to the right UTC instant", () => {
    expect(householdLocalToInstant("2026-01-15", "18:00")).toBe("2026-01-15T23:00:00.000Z");
  });

  it("resolves a summer (EDT, UTC-4) wall-clock time to the right UTC instant", () => {
    expect(householdLocalToInstant("2026-07-15", "18:00")).toBe("2026-07-15T22:00:00.000Z");
  });

  it("treats a missing time as local midnight", () => {
    expect(householdLocalToInstant("2026-07-15")).toBe("2026-07-15T04:00:00.000Z");
  });

  it("is independent of the process timezone (same result the failure mode would break)", () => {
    // 4:00 PM Eastern on a summer day -> 20:00Z, never 20:00 local-as-UTC.
    expect(householdLocalToInstant("2026-08-20", "16:00")).toBe("2026-08-20T20:00:00.000Z");
  });
});
