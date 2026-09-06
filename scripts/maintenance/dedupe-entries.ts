/**
 * One-off maintenance script — not part of the deployed app.
 *
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts            # dry run, exact matches
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts --apply    # execute
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts --fuzzy    # also token-overlap + one LLM check per near-miss
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts --fuzzy --apply
 *
 * The scan pipeline now dedupes across emails at write time, but rows that
 * predate that still overlap. This collapses them: it keeps the best row in
 * a duplicate set, merges any detail the losers have and the keeper lacks
 * into the keeper (location, notes, end time, arrival, and a mergedSources
 * trail), then sets the losers to `dismissed` (reversible — nothing is
 * deleted). Exact mode groups on normalised-title + local date; `--fuzzy`
 * additionally checks same-local-day, same-kind-family rows via the shared
 * dedupe primitives.
 */
import { getSupabaseClient } from "../../lib/supabase";
import {
  anchorLocalDate,
  buildMergePatch,
  llmDisambiguate,
  triageCandidates,
  type ExistingEntry,
} from "../pipeline/dedupe";
import type { ExtractedItem } from "../pipeline/extract/extractEvents";
import type { MessageMeta } from "../pipeline/write";
import type { SourceDetail } from "../../lib/types";

const APPLY = process.argv.includes("--apply");
const FUZZY = process.argv.includes("--fuzzy");
/** --skip=<id>,<id> — loser ids to leave alone (a proposed merge that is
 * actually two distinct things). A plan whose every loser is skipped is
 * dropped entirely. */
const SKIP = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.slice("--skip=".length) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const SELECT =
  "id,kind,title,starts_at,ends_at,due_at,is_all_day,location_text,notes,category,subject_member_id,arrival_at,arrival_source,status,source_detail,created_at";

type Row = ExistingEntry & { created_at: string };

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function anchorDate(r: Row): string {
  return anchorLocalDate(r) ?? "no-date";
}

const STATUS_RANK: Record<string, number> = { confirmed: 0, pending_review: 1, dismissed: 2 };

/** Lower is better — this row is the one to keep. */
function score(r: Row): [number, number, number] {
  return [STATUS_RANK[r.status] ?? 3, r.ends_at ? 0 : 1, Date.parse(r.created_at)];
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function localTime(instant: string | null, isAllDay: boolean): string | null {
  if (!instant || isAllDay) return null;
  const d = new Date(instant);
  // household-local HH:mm — reuse householdLocalDate's tz by formatting via toLocaleTimeString
  return d
    .toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })
    .slice(0, 5);
}

/** A DB row viewed as a freshly-extracted item, for the fuzzy comparison. */
function rowToItem(r: Row): ExtractedItem {
  return {
    kind: r.kind,
    title: r.title,
    person_hint: null,
    date: anchorLocalDate(r),
    time: localTime(r.starts_at, r.is_all_day),
    end_time: localTime(r.ends_at, r.is_all_day),
    arrival_time: null,
    category: r.category as ExtractedItem["category"],
    location: r.location_text,
    is_critical: false,
    notes: r.notes,
    source_excerpt: (r.source_detail?.extractedSnippet as string) ?? "",
    source: "body",
    attachment_name: null,
    attachment_page: null,
  };
}

function pseudoMeta(r: Row): MessageMeta {
  const sd: SourceDetail = r.source_detail ?? {};
  return {
    gmailMessageId: sd.gmailMessageId ?? r.id,
    threadId: sd.threadId ?? "",
    sender: sd.sender ?? "",
    subject: sd.subject ?? r.title,
    receivedAt: sd.receivedAt ?? null,
    googleAccountEmail: sd.googleAccountEmail ?? null,
  };
}

interface Plan {
  keep: Row;
  drop: Row[];
  /** patch to apply to `keep` before dropping (merged detail). */
  patch: Record<string, unknown> | null;
}

function planExact(rows: Row[]): Plan[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${normTitle(row.title)}|${anchorDate(row)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }
  const plans: Plan[] = [];
  for (const [, group] of groups) {
    if (group.length < 2 || group.every((r) => r.status === "dismissed")) continue;
    const sorted = [...group].sort((a, b) => cmp(score(a), score(b)));
    const keep = sorted[0];
    const drop = sorted.slice(1).filter((r) => r.status !== "dismissed");
    if (drop.length) plans.push({ keep, drop, patch: mergeAll(keep, drop) });
  }
  return plans;
}

async function planFuzzy(rows: Row[], alreadyDropped: Set<string>): Promise<Plan[]> {
  // Oldest first; each older row is a potential keeper for newer near-misses.
  const byAge = [...rows]
    .filter((r) => r.status !== "dismissed" && !alreadyDropped.has(r.id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  const plans: Plan[] = [];
  const consumed = new Set<string>();
  for (let i = 0; i < byAge.length; i++) {
    const newer = byAge[i];
    if (consumed.has(newer.id)) continue;
    const olders = byAge.slice(0, i).filter((r) => !consumed.has(r.id));
    if (olders.length === 0) continue;

    const item = rowToItem(newer);
    const { certain, maybes } = triageCandidates(item, olders, newer.subject_member_id);
    const match = certain ?? (maybes.length ? await llmDisambiguate(item, maybes) : null);
    if (!match) continue;
    const keep = olders.find((o) => o.id === match.id);
    if (!keep) continue;

    consumed.add(newer.id);
    const { patch } = buildMergePatch(keep, item, pseudoMeta(newer), newer.subject_member_id);
    plans.push({ keep, drop: [newer], patch });
  }
  return plans;
}

/** Merge every loser's blanks-filling detail into the keeper (exact mode,
 * where there can be several losers per keeper). */
function mergeAll(keep: Row, drop: Row[]): Record<string, unknown> | null {
  let acc: Record<string, unknown> | null = null;
  let base = keep;
  for (const loser of drop) {
    const { patch, filled } = buildMergePatch(base, rowToItem(loser), pseudoMeta(loser), null);
    if (filled.length || acc == null) {
      acc = { ...(acc ?? {}), ...patch };
      base = { ...base, ...patch } as Row;
    }
  }
  return acc;
}

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT)
    .order("created_at")
    .returns<Row[]>();
  if (error) throw error;

  const planned = planExact(data);
  const dropped = new Set(planned.flatMap((p) => p.drop.map((r) => r.id)));
  if (FUZZY) planned.push(...(await planFuzzy(data, dropped)));

  // Honour --skip: drop skipped losers, recompute each keeper's merge patch
  // from only the surviving losers, and drop any plan left with none.
  const plans = planned
    .map((p) => {
      const drop = p.drop.filter((r) => !SKIP.has(r.id));
      return { ...p, drop, patch: drop.length ? mergeAll(p.keep, drop) : null };
    })
    .filter((p) => p.drop.length > 0);
  const skippedCount = planned.reduce(
    (n, p) => n + p.drop.filter((r) => SKIP.has(r.id)).length,
    0
  );
  if (skippedCount) console.log(`Skipping ${skippedCount} loser(s) via --skip.\n`);

  if (plans.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  for (const p of plans) {
    console.log(`\n«${p.keep.title.slice(0, 68)}»  (${anchorDate(p.keep)})`);
    console.log(
      `  KEEP    ${p.keep.kind.padEnd(8)} ${p.keep.status.padEnd(14)} ${p.keep.created_at.slice(0, 19)}  ${p.keep.id}`
    );
    if (p.patch) {
      const fields = Object.keys(p.patch).filter((k) => k !== "source_detail");
      console.log(`  merge  → ${fields.length ? fields.join(", ") : "(source trail only)"}`);
    }
    for (const r of p.drop) {
      console.log(
        `  dismiss ${r.kind.padEnd(8)} ${r.status.padEnd(14)} ${r.created_at.slice(0, 19)}  ${r.id}  «${r.title.slice(0, 40)}»`
      );
    }
  }

  const losers = plans.flatMap((p) => p.drop);
  console.log(`\n${losers.length} row(s) to dismiss; ${plans.filter((p) => p.patch).length} keeper(s) get merged detail.`);

  if (!APPLY) {
    console.log("Dry run — re-run with --apply to write.");
    return;
  }

  for (const p of plans) {
    if (p.patch) {
      const { error: mErr } = await supabase
        .from("entries")
        .update({ ...p.patch, updated_at: new Date().toISOString() })
        .eq("id", p.keep.id);
      if (mErr) throw mErr;
    }
  }
  const { error: updErr } = await supabase
    .from("entries")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .in(
      "id",
      losers.map((r) => r.id)
    );
  if (updErr) throw updErr;
  console.log("Done — merged detail into keepers and dismissed duplicates (reversible via status).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
