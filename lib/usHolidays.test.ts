import { describe, expect, it } from "vitest";
import { federalHolidayOn, isFederalHoliday } from "./usHolidays";

describe("federalHolidayOn", () => {
  it("resolves fixed-date holidays", () => {
    expect(federalHolidayOn("2026-01-01")).toBe("New Year's Day");
    expect(federalHolidayOn("2026-06-19")).toBe("Juneteenth");
    expect(federalHolidayOn("2026-07-04")).toBe("Independence Day");
    expect(federalHolidayOn("2026-11-11")).toBe("Veterans Day");
    expect(federalHolidayOn("2026-12-25")).toBe("Christmas Day");
  });

  it("resolves Labor Day as the first Monday of September", () => {
    expect(federalHolidayOn("2026-09-07")).toBe("Labor Day");
    expect(federalHolidayOn("2025-09-01")).toBe("Labor Day");
    expect(federalHolidayOn("2024-09-02")).toBe("Labor Day");
  });

  it("resolves the other floating-Monday holidays", () => {
    expect(federalHolidayOn("2026-01-19")).toBe("Martin Luther King Jr. Day"); // 3rd Mon
    expect(federalHolidayOn("2026-02-16")).toBe("Presidents' Day"); // 3rd Mon
    expect(federalHolidayOn("2026-05-25")).toBe("Memorial Day"); // last Mon
    expect(federalHolidayOn("2026-10-12")).toBe("Columbus Day"); // 2nd Mon
  });

  it("resolves Thanksgiving as the fourth Thursday of November", () => {
    expect(federalHolidayOn("2026-11-26")).toBe("Thanksgiving");
    expect(federalHolidayOn("2025-11-27")).toBe("Thanksgiving");
  });

  it("returns null for ordinary days and near-misses", () => {
    expect(federalHolidayOn("2026-09-06")).toBeNull();
    expect(federalHolidayOn("2026-09-08")).toBeNull();
    expect(federalHolidayOn("2026-11-19")).toBeNull(); // 3rd Thu Nov
    expect(federalHolidayOn("2026-07-05")).toBeNull();
  });

  it("returns null for a malformed date", () => {
    expect(federalHolidayOn("nope")).toBeNull();
    expect(federalHolidayOn("2026-9-7")).toBeNull();
  });

  it("isFederalHoliday is the boolean form", () => {
    expect(isFederalHoliday("2026-09-07")).toBe(true);
    expect(isFederalHoliday("2026-09-06")).toBe(false);
  });
});
