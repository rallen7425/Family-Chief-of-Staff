/**
 * Cross-email deduplication for the scan pipeline.
 *
 * The scan extracts one email at a time, so the same real-world thing
 * described in two emails ("Get Your Swag" mentions the Sep 7 kickoff
 * party; a later "LABOR DAY KICKOFF PARTY" email describes it in full)
 * used to produce two rows. This module decides, for a freshly extracted
 * item, whether an existing entry already represents it — a fast
 * structural check first, then one small LLM call for the near-misses a
 * string match can't settle — and builds the patch that folds the new
 * email's detail into the surviving row.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { householdLocalDate, householdLocalToInstant } from "@/lib/householdTime";
import type { EntryKind, SourceDetail } from "@/lib/types";
import type { ExtractedItem } from "./extract/extractEvents";
import type { MessageMeta } from "./write";

const client = new Anthropic();

/** The subset of an `entries` row cross-email dedupe needs. */
export interface ExistingEntry {
  id: string;
  kind: EntryKind;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  is_all_day: boolean;
  location_text: string | null;
  notes: string | null;
  category: string | null;
  subject_member_id: string | null;
  arrival_at: string | null;
  arrival_source: string | null;
  status: string;
  source_detail: SourceDetail | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "at", "on", "in", "with",
  "your", "our", "day", "night", "event", "meeting", "no", "day's",
]);

export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function titleTokens(t: string): Set<string> {
  return new Set(
    normalizeTitle(t)
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Fraction of the smaller token set that the two titles share (0–1). */
function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const tok of a) if (b.has(tok)) shared++;
  return shared / Math.min(a.size, b.size);
}

/** "YYYY-MM-DD" + n days. */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** An existing entry's own household-local anchor date, or null. */
export function anchorLocalDate(e: ExistingEntry): string | null {
  if (e.due_at) return e.due_at.slice(0, 10);
  if (e.starts_at) return householdLocalDate(e.starts_at);
  return null;
}

const CLOSURE_RE = /\b(no school|no classes|campus closed|school closed|office closed|closed\b|holiday|day off|early (dismissal|release)|half day)\b/i;

/** Same kind always matches. event↔advisory only when the event is an
 * all-day CLOSURE — the one real cross-kind case (an old scan filed a
 * holiday as an all-day event; the fixed prompt files it as an advisory).
 * Anything else across kinds (e.g. a "practice ending early" advisory vs.
 * the practice event) is a different thing. task↔task only; reminders
 * never dedupe here. */
function kindsCompatible(
  a: { kind: EntryKind; isAllDay: boolean; title: string },
  b: { kind: EntryKind; isAllDay: boolean; title: string }
): boolean {
  if (a.kind === b.kind) return true;
  const pair = [a, b];
  const ev = pair.find((x) => x.kind === "event");
  const ad = pair.find((x) => x.kind === "advisory");
  if (!ev || !ad) return false;
  return ev.isAllDay && (CLOSURE_RE.test(ev.title) || CLOSURE_RE.test(ad.title));
}

export type Triage = { certain: ExistingEntry | null; maybes: ExistingEntry[] };

/**
 * Split candidates into a certain structural match (same local day + near-
 * identical title) and the "maybe"s worth an LLM look (same/adjacent day
 * with partial title or subject overlap). Pure — no I/O.
 */
export function triageCandidates(
  item: ExtractedItem,
  candidates: ExistingEntry[],
  subjectId: string | null
): Triage {
  if (!item.date) return { certain: null, maybes: [] };
  const itemTokens = titleTokens(item.title);
  const itemNorm = normalizeTitle(item.title);

  const itemShape = { kind: item.kind, isAllDay: !item.time, title: item.title };
  const maybes: ExistingEntry[] = [];
  for (const c of candidates) {
    if (!kindsCompatible(itemShape, { kind: c.kind, isAllDay: c.is_all_day, title: c.title })) {
      continue;
    }
    const cDate = anchorLocalDate(c);
    if (!cDate) continue;
    const dayGap = Math.abs(
      (Date.parse(`${cDate}T00:00:00Z`) - Date.parse(`${item.date}T00:00:00Z`)) / 86_400_000
    );
    if (dayGap > 1) continue;

    const cNorm = normalizeTitle(c.title);
    const overlap = tokenOverlap(itemTokens, titleTokens(c.title));
    const sameSubject =
      item.kind !== "advisory" && subjectId != null && c.subject_member_id === subjectId;

    const titleMatch =
      dayGap === 0 &&
      (cNorm === itemNorm || cNorm.includes(itemNorm) || itemNorm.includes(cNorm) || overlap >= 0.7);

    if (titleMatch) return { certain: c, maybes: [] };
    if (overlap >= 0.3 || sameSubject || dayGap === 0) maybes.push(c);
  }
  return { certain: null, maybes: maybes.slice(0, 6) };
}

const LlmResult = z.object({
  matchId: z
    .string()
    .nullable()
    .describe("id of the existing entry that is the SAME real-world occurrence, or null"),
});

/** One cheap call to settle whether any "maybe" is the same real thing. */
export async function llmDisambiguate(
  item: ExtractedItem,
  maybes: ExistingEntry[]
): Promise<ExistingEntry | null> {
  if (maybes.length === 0) return null;

  const newItem = {
    kind: item.kind,
    title: item.title,
    date: item.date,
    time: item.time,
    location: item.location,
    notes: item.notes,
  };
  const existing = maybes.map((m) => ({
    id: m.id,
    kind: m.kind,
    title: m.title,
    date: anchorLocalDate(m),
    all_day: m.is_all_day,
    location: m.location_text,
    notes: m.notes,
  }));

  const response = await client.messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system:
      "You dedupe a family calendar. Given one NEW item and a list of EXISTING entries, " +
      "return the id of the existing entry that is the SAME real-world occurrence as the new item " +
      "(same happening, same day — titles/wording will differ, one may be vaguer or all-day), or null " +
      "if none is the same. Different occurrences of a recurring activity, or two genuinely different " +
      "events on the same day, are NOT matches.",
    messages: [
      {
        role: "user",
        content: `NEW:\n${JSON.stringify(newItem)}\n\nEXISTING:\n${JSON.stringify(existing)}`,
      },
    ],
    output_config: { format: zodOutputFormat(LlmResult) },
  });

  const id = response.parsed_output?.matchId ?? null;
  return id ? maybes.find((m) => m.id === id) ?? null : null;
}

export interface MergePatch {
  patch: Record<string, unknown>;
  filled: string[];
}

/**
 * Fields the new email can contribute to the surviving row: blanks get
 * filled, an all-day row is upgraded to timed when the new item has a
 * start, and the new email is recorded in source_detail.mergedSources.
 * Existing non-blank values are never overwritten. `filled` is empty when
 * the only change is recording the extra source.
 */
export function buildMergePatch(
  existing: ExistingEntry,
  item: ExtractedItem,
  meta: MessageMeta,
  resolvedSubjectId: string | null
): MergePatch {
  const patch: Record<string, unknown> = {};
  const filled: string[] = [];
  const isBlank = (v: unknown) => v == null || v === "";

  if (isBlank(existing.location_text) && item.location) {
    patch.location_text = item.location;
    filled.push("location");
  }
  if (isBlank(existing.notes) && item.notes) {
    patch.notes = item.notes;
    filled.push("notes");
  }
  if (isBlank(existing.category) && item.category && existing.kind !== "advisory") {
    patch.category = item.category;
    filled.push("category");
  }
  if (
    isBlank(existing.subject_member_id) &&
    resolvedSubjectId &&
    existing.kind !== "advisory"
  ) {
    patch.subject_member_id = resolvedSubjectId;
    filled.push("subject");
  }

  // Upgrade a thin all-day row to the timed detail from this email.
  if (existing.is_all_day && item.date && item.time && existing.kind !== "advisory") {
    patch.is_all_day = false;
    patch.starts_at = householdLocalToInstant(item.date, item.time);
    patch.ends_at = item.end_time ? householdLocalToInstant(item.date, item.end_time) : null;
    filled.push("start time");
    if (item.arrival_time) {
      patch.arrival_at = householdLocalToInstant(item.date, item.arrival_time);
      patch.arrival_source = "stated";
      filled.push("arrival");
    }
  }

  const mergedSources = [
    ...(existing.source_detail?.mergedSources ?? []),
    {
      gmailMessageId: meta.gmailMessageId,
      subject: meta.subject,
      sender: meta.sender,
      extractedSnippet: item.source_excerpt,
    },
  ];
  patch.source_detail = { ...(existing.source_detail ?? {}), mergedSources };

  return { patch, filled };
}
