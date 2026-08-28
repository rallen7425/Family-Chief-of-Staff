import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { formatDateParam, parseDateParam } from "@/lib/dateParam";

describe("parseDateParam", () => {
  it("parses a valid YYYY-MM-DD to that local calendar day", () => {
    const d = parseDateParam("2026-03-14");
    expect(format(d, "yyyy-MM-dd")).toBe("2026-03-14");
  });

  it("falls back to today for undefined", () => {
    expect(format(parseDateParam(), "yyyy-MM-dd")).toBe(format(new Date(), "yyyy-MM-dd"));
  });

  it("falls back to today for a malformed value", () => {
    expect(format(parseDateParam("not-a-date"), "yyyy-MM-dd")).toBe(format(new Date(), "yyyy-MM-dd"));
    expect(format(parseDateParam("2026-13-99"), "yyyy-MM-dd")).toBe(format(new Date(), "yyyy-MM-dd"));
  });
});

describe("formatDateParam", () => {
  it("round-trips with parseDateParam", () => {
    expect(formatDateParam(parseDateParam("2026-11-01"))).toBe("2026-11-01");
  });
});
