import { describe, expect, it } from "vitest";
import {
  addDays,
  anchorLocalDate,
  buildMergePatch,
  normalizeTitle,
  titleTokens,
  triageCandidates,
  type ExistingEntry,
} from "./dedupe";
import type { ExtractedItem } from "./extract/extractEvents";
import type { MessageMeta } from "./write";

function mkItem(p: Partial<ExtractedItem>): ExtractedItem {
  return {
    kind: "event",
    title: "Untitled",
    person_hint: null,
    date: "2026-09-07",
    time: null,
    end_time: null,
    arrival_time: null,
    category: null,
    location: null,
    is_critical: false,
    notes: null,
    source_excerpt: "…",
    source: "body",
    attachment_name: null,
    attachment_page: null,
    ...p,
  };
}

function mkExisting(p: Partial<ExistingEntry>): ExistingEntry {
  return {
    id: "e1",
    kind: "event",
    title: "Untitled",
    starts_at: "2026-09-07T16:00:00+00:00",
    ends_at: null,
    due_at: null,
    is_all_day: false,
    location_text: null,
    notes: null,
    category: null,
    subject_member_id: null,
    arrival_at: null,
    arrival_source: null,
    status: "confirmed",
    source_detail: {},
    ...p,
  };
}

const meta: MessageMeta = {
  gmailMessageId: "m-new",
  threadId: "t",
  sender: "SJP Football Team Moms <x@gmail.com>",
  subject: "LABOR DAY KICKOFF PARTY",
  receivedAt: "2026-09-06T04:31:00.000Z",
  provider: "google",
  accountEmail: "rallen7425@gmail.com",
  connectionId: "conn-1",
};

describe("normalizeTitle / titleTokens", () => {
  it("strips punctuation and case", () => {
    expect(normalizeTitle("Team #120 — Football Kickoff Party!")).toBe(
      "team 120 football kickoff party"
    );
  });

  it("drops short words and stopwords ('day' is a stopword, 'party' is signal)", () => {
    expect([...titleTokens("Labor Day Kickoff Party")].sort()).toEqual([
      "kickoff",
      "labor",
      "party",
    ]);
  });
});

describe("addDays", () => {
  it("moves a YYYY-MM-DD string across a month boundary", () => {
    expect(addDays("2026-09-07", -1)).toBe("2026-09-06");
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });
});

describe("anchorLocalDate", () => {
  it("uses due_at for tasks and household-local date for timed rows", () => {
    expect(anchorLocalDate(mkExisting({ kind: "task", due_at: "2026-09-07", starts_at: null }))).toBe(
      "2026-09-07"
    );
    // 02:30Z on the 7th is still the 6th in America/New_York
    expect(anchorLocalDate(mkExisting({ starts_at: "2026-09-07T02:30:00+00:00" }))).toBe("2026-09-06");
  });
});

describe("triageCandidates", () => {
  it("returns a certain match for a same-day near-identical title", () => {
    const { certain } = triageCandidates(
      mkItem({ title: "School Picture Day" }),
      [mkExisting({ id: "pic", title: "School Picture Day", is_all_day: true, starts_at: "2026-09-07T04:00:00+00:00" })],
      null
    );
    expect(certain?.id).toBe("pic");
  });

  it("sends a same-day different-title candidate to the LLM maybes", () => {
    const { certain, maybes } = triageCandidates(
      mkItem({ title: "Labor Day Kickoff Party" }),
      [
        mkExisting({
          id: "swag",
          title: "Team #120 Football Kickoff Party",
          is_all_day: true,
          starts_at: "2026-09-07T04:00:00+00:00",
        }),
      ],
      null
    );
    expect(certain).toBeNull();
    expect(maybes.map((m) => m.id)).toEqual(["swag"]);
  });

  it("excludes candidates more than a day away", () => {
    const { certain, maybes } = triageCandidates(
      mkItem({ title: "Kickoff Party", date: "2026-09-07" }),
      [mkExisting({ id: "far", title: "Kickoff Party", starts_at: "2026-09-10T16:00:00+00:00" })],
      null
    );
    expect(certain).toBeNull();
    expect(maybes).toHaveLength(0);
  });

  it("does not match a task against an event", () => {
    const { certain, maybes } = triageCandidates(
      mkItem({ kind: "task", title: "Order photos" }),
      [mkExisting({ id: "ev", kind: "event", title: "Order photos", starts_at: "2026-09-07T16:00:00+00:00" })],
      null
    );
    expect(certain).toBeNull();
    expect(maybes).toHaveLength(0);
  });

  it("treats an event and an advisory as the same kind family", () => {
    const { certain } = triageCandidates(
      mkItem({ kind: "advisory", title: "No School Labor Day" }),
      [
        mkExisting({
          id: "adv",
          kind: "event",
          title: "No School Labor Day",
          is_all_day: true,
          starts_at: "2026-09-07T04:00:00+00:00",
        }),
      ],
      null
    );
    expect(certain?.id).toBe("adv");
  });

  it("does NOT match a 'practice ending early' advisory against the practice event", () => {
    const { certain, maybes } = triageCandidates(
      mkItem({ kind: "advisory", title: "Today's practice ending early", time: "16:00" }),
      [
        mkExisting({
          id: "prac",
          kind: "event",
          title: "Football practice",
          is_all_day: false,
          starts_at: "2026-09-07T20:00:00+00:00",
        }),
      ],
      null
    );
    expect(certain).toBeNull();
    expect(maybes).toHaveLength(0);
  });

  it("finds nothing when the new item has no date", () => {
    const { certain, maybes } = triageCandidates(mkItem({ date: null }), [mkExisting({})], null);
    expect(certain).toBeNull();
    expect(maybes).toHaveLength(0);
  });
});

describe("buildMergePatch", () => {
  it("fills blank fields and records the extra source, never overwriting", () => {
    const existing = mkExisting({
      notes: "Casual attire.",
      location_text: null,
      source_detail: { gmailMessageId: "m-old", subject: "Get Your Swag" },
    });
    const { patch, filled } = buildMergePatch(
      existing,
      mkItem({ notes: "RSVP via SignUpGenius", location: "Feudo Home, 12 Stonebridge Rd" }),
      meta,
      null
    );
    expect(patch.location_text).toBe("Feudo Home, 12 Stonebridge Rd");
    expect(patch.notes).toBeUndefined(); // existing notes kept
    expect(filled).toEqual(["location"]);
    expect((patch.source_detail as { mergedSources: unknown[] }).mergedSources).toHaveLength(1);
    expect((patch.source_detail as { gmailMessageId: string }).gmailMessageId).toBe("m-old");
  });

  it("upgrades a thin all-day row to the timed detail from the new email", () => {
    const { patch, filled } = buildMergePatch(
      mkExisting({ is_all_day: true, starts_at: "2026-09-07T04:00:00+00:00" }),
      mkItem({ time: "12:00", end_time: "16:00", arrival_time: "11:45" }),
      meta,
      null
    );
    expect(patch.is_all_day).toBe(false);
    expect(patch.starts_at).toBe("2026-09-07T16:00:00.000Z");
    expect(patch.ends_at).toBe("2026-09-07T20:00:00.000Z");
    expect(patch.arrival_at).toBe("2026-09-07T15:45:00.000Z");
    expect(filled).toContain("start time");
  });
});
