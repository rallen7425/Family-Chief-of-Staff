import { describe, expect, it } from "vitest";
import { ageInYears, computeIsAdult, colorInUseByOthers, initialsOf } from "@/lib/family";
import type { FamilyMember } from "@/lib/types";

const NOW = new Date("2026-08-30T12:00:00.000Z");

describe("ageInYears", () => {
  it("returns null for no birthday or an unparseable string", () => {
    expect(ageInYears(null, NOW)).toBeNull();
    expect(ageInYears(undefined, NOW)).toBeNull();
    expect(ageInYears("not a date", NOW)).toBeNull();
    expect(ageInYears("2013-13-40", NOW)).toBeNull();
  });
  it("uses month/day, not just the year", () => {
    expect(ageInYears("2008-08-30", NOW)).toBe(18); // birthday is today
    expect(ageInYears("2008-08-29", NOW)).toBe(18); // birthday was yesterday
    expect(ageInYears("2008-08-31", NOW)).toBe(17); // birthday is tomorrow
  });
});

describe("computeIsAdult", () => {
  it("treats a missing birthday as adult", () => {
    expect(computeIsAdult(null, NOW)).toBe(true);
    expect(computeIsAdult("garbage", NOW)).toBe(true);
  });
  it("is 18+", () => {
    expect(computeIsAdult("1985-03-15", NOW)).toBe(true);
    expect(computeIsAdult("2013-05-14", NOW)).toBe(false);
    expect(computeIsAdult("2008-08-30", NOW)).toBe(true); // turns 18 today
    expect(computeIsAdult("2008-08-31", NOW)).toBe(false); // turns 18 tomorrow
  });
});

describe("initialsOf", () => {
  it("takes up to two initials", () => {
    expect(initialsOf("Rick Allen")).toBe("RA");
    expect(initialsOf("Ben")).toBe("B");
    expect(initialsOf("  mary  jane  watson ")).toBe("MJ");
    expect(initialsOf("")).toBe("");
  });
});

describe("colorInUseByOthers", () => {
  const mk = (id: string, accentColor: FamilyMember["accentColor"]): FamilyMember => ({
    id,
    name: id,
    accentColor,
    isAdult: true,
    isHeadOfHousehold: false,
  });
  const members = [mk("a", "blue"), mk("b", "teal"), mk("c", "gold")];

  it("flags a colour another member already has", () => {
    expect(colorInUseByOthers(members, "teal", "a")).toBe(true);
  });
  it("ignores the member being edited", () => {
    expect(colorInUseByOthers(members, "teal", "b")).toBe(false);
  });
  it("is false for an unused colour", () => {
    expect(colorInUseByOthers(members, "red", "a")).toBe(false);
  });
});
