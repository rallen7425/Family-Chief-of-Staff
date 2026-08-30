import { describe, expect, it } from "vitest";
import { extractSenderDomain, resolveByDomain, resolvePerson } from "./write";
import type { FamilyMember } from "@/lib/types";
import type { MemberEmailDomain } from "@/lib/data/memberEmailDomains";

const ben: FamilyMember = { id: "ben", name: "Ben", accentColor: "gold", isAdult: false, isHeadOfHousehold: false };
const nora: FamilyMember = { id: "nora", name: "Nora", accentColor: "berry", isAdult: false, isHeadOfHousehold: false };
const family = [ben, nora];

const domains: MemberEmailDomain[] = [
  { domain: "stjohnsprep.org", familyMemberId: "ben" },
  { domain: "veracross.com", familyMemberId: "nora" },
];

describe("extractSenderDomain", () => {
  it("pulls the domain out of a display-name + angle-bracket address", () => {
    expect(extractSenderDomain('"Austin Prep" <mail1@veracross.com>')).toBe("veracross.com");
  });

  it("lowercases and handles a bare address", () => {
    expect(extractSenderDomain("Coach@StJohnsPrep.org")).toBe("stjohnsprep.org");
  });

  it("returns null when there is no address", () => {
    expect(extractSenderDomain("no-reply (system)")).toBeNull();
  });
});

describe("resolveByDomain", () => {
  it("maps a known sender domain to its family member", () => {
    expect(resolveByDomain("news@stjohnsprep.org", domains)).toBe("ben");
  });

  it("matches a subdomain of a known domain", () => {
    expect(resolveByDomain("bounce@mail.veracross.com", domains)).toBe("nora");
  });

  it("returns null for an unknown domain", () => {
    expect(resolveByDomain("mom@gmail.com", domains)).toBeNull();
  });
});

describe("resolvePerson", () => {
  it("trusts an LLM hint that names a real family member", () => {
    expect(resolvePerson("Ben", "nora", family)).toBe("ben");
  });

  it("is case-insensitive on the hint", () => {
    expect(resolvePerson("nora", null, family)).toBe("nora");
  });

  it("leaves it unassigned when the hint names a non-family person, rather than falling back to the domain", () => {
    // The regression this guards: a school-domain email whose body names a
    // teacher must NOT get pinned to that school's kid.
    expect(resolvePerson("Mr. Rivera", "ben", family)).toBeNull();
  });

  it("uses the domain match when there is no hint", () => {
    expect(resolvePerson(null, "ben", family)).toBe("ben");
  });

  it("returns null when there is neither a usable hint nor a domain match", () => {
    expect(resolvePerson(null, null, family)).toBeNull();
  });
});
