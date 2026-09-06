import { describe, expect, it } from "vitest";
import { extractSenderDomain, pickReminderParent, resolveByDomain, resolvePerson } from "./write";
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

describe("pickReminderParent", () => {
  it("returns null when the email produced no event/task to hang off", () => {
    expect(pickReminderParent({ title: "Bring a towel" }, [])).toBeNull();
  });

  it("links to the sole candidate without needing a title match", () => {
    expect(
      pickReminderParent({ title: "Bring bathing suit and towel to Kickoff Party" }, [
        { id: "party", title: "Labor Day Kickoff Party" },
      ])
    ).toBe("party");
  });

  it("picks the best title-token overlap when there are several candidates", () => {
    expect(
      pickReminderParent({ title: "Wear chapel dress for Picture Day" }, [
        { id: "game", title: "Soccer game vs. Andover" },
        { id: "pics", title: "School Picture Day" },
      ])
    ).toBe("pics");
  });

  it("stays standalone when nothing overlaps and the parent is ambiguous", () => {
    expect(
      pickReminderParent({ title: "Bring a water bottle" }, [
        { id: "a", title: "Soccer game vs. Andover" },
        { id: "b", title: "Orchestra rehearsal" },
      ])
    ).toBeNull();
  });
});
