import { describe, expect, it } from "vitest";
import {
  computeVisibleMemberIds,
  describeVisibility,
  isEventVisibleToViewer,
} from "@/lib/visibility";
import type { FamilyMember } from "@/lib/types";

const hoh = { isHeadOfHousehold: false };
const rick: FamilyMember = { id: "rick", name: "Rick", accentColor: "coral", isAdult: true, ...hoh };
const kim: FamilyMember = { id: "kim", name: "Kim", accentColor: "teal", isAdult: true, ...hoh };
const ben: FamilyMember = { id: "ben", name: "Ben", accentColor: "gold", isAdult: false, ...hoh };
const nora: FamilyMember = { id: "nora", name: "Nora", accentColor: "berry", isAdult: false, ...hoh };
const family = [rick, kim, ben, nora];

describe("computeVisibleMemberIds", () => {
  it("whole-family event (no assignee) is visible to everyone", () => {
    expect(computeVisibleMemberIds({ familyMemberId: null }, family)).toBe("everyone");
  });

  it("an adult's own event is private to that adult only", () => {
    expect(computeVisibleMemberIds({ familyMemberId: "rick" }, family)).toEqual(["rick"]);
  });

  it("a kid's event is visible to that kid plus every adult, not the other kid", () => {
    const visible = computeVisibleMemberIds({ familyMemberId: "ben" }, family);
    expect(visible).toEqual(expect.arrayContaining(["ben", "rick", "kim"]));
    expect(visible).not.toContain("nora");
    expect(visible as string[]).toHaveLength(3);
  });

  it("falls back to everyone when the assignee id matches no known member", () => {
    expect(computeVisibleMemberIds({ familyMemberId: "ghost" }, family)).toBe("everyone");
  });
});

describe("isEventVisibleToViewer", () => {
  it("hides one adult's private event from the other adult", () => {
    expect(isEventVisibleToViewer({ familyMemberId: "rick" }, "kim", family)).toBe(false);
    expect(isEventVisibleToViewer({ familyMemberId: "rick" }, "rick", family)).toBe(true);
  });

  it("shows a kid's event under either parent", () => {
    expect(isEventVisibleToViewer({ familyMemberId: "nora" }, "rick", family)).toBe(true);
    expect(isEventVisibleToViewer({ familyMemberId: "nora" }, "kim", family)).toBe(true);
  });

  it("hides one kid's event from the other kid", () => {
    expect(isEventVisibleToViewer({ familyMemberId: "nora" }, "ben", family)).toBe(false);
  });

  it("shows whole-family events to any viewer", () => {
    expect(isEventVisibleToViewer({ familyMemberId: null }, "ben", family)).toBe(true);
  });
});

describe("describeVisibility", () => {
  it("reads 'Everyone' for a whole-family event", () => {
    expect(describeVisibility({ familyMemberId: null }, family)).toBe("Everyone");
  });

  it("reads '<name> only' for an adult's private event", () => {
    expect(describeVisibility({ familyMemberId: "kim" }, family)).toBe("Kim only");
  });

  it("lists the kid and the adults for a kid's event", () => {
    expect(describeVisibility({ familyMemberId: "ben" }, family)).toBe("Ben, Rick, Kim");
  });
});
