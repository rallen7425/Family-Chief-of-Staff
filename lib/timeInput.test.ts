import { describe, expect, it } from "vitest";
import { formatTimeLabel, parseTimeInput } from "@/lib/timeInput";

describe("parseTimeInput", () => {
  it("parses 24-hour HH:mm", () => {
    expect(parseTimeInput("16:00")).toBe("16:00");
    expect(parseTimeInput("09:30")).toBe("09:30");
    expect(parseTimeInput("0:05")).toBe("00:05");
  });

  it("parses 12-hour with am/pm, spaced or not", () => {
    expect(parseTimeInput("4pm")).toBe("16:00");
    expect(parseTimeInput("4:30 pm")).toBe("16:30");
    expect(parseTimeInput("4:30PM")).toBe("16:30");
    expect(parseTimeInput("12am")).toBe("00:00");
    expect(parseTimeInput("12pm")).toBe("12:00");
    expect(parseTimeInput("12:15 am")).toBe("00:15");
  });

  it("parses bare digit blobs", () => {
    expect(parseTimeInput("9")).toBe("09:00");
    expect(parseTimeInput("930")).toBe("09:30");
    expect(parseTimeInput("0930")).toBe("09:30");
    expect(parseTimeInput("1745")).toBe("17:45");
    expect(parseTimeInput("430pm")).toBe("16:30");
  });

  it("rejects garbage and out-of-range values", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("nope")).toBeNull();
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("10:75")).toBeNull();
    expect(parseTimeInput("08/26/2026")).toBeNull();
  });
});

describe("formatTimeLabel", () => {
  it("renders a 12-hour label", () => {
    expect(formatTimeLabel("16:00")).toBe("4:00 PM");
    expect(formatTimeLabel("00:00")).toBe("12:00 AM");
    expect(formatTimeLabel("12:05")).toBe("12:05 PM");
    expect(formatTimeLabel("09:30")).toBe("9:30 AM");
  });
});
