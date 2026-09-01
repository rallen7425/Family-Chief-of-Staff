/**
 * One-off maintenance script — not part of the deployed app.
 *
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts          # dry run
 *   node --env-file=.env.local ./node_modules/.bin/tsx scripts/maintenance/dedupe-entries.ts --apply  # execute
 *
 * The email scan has no cross-email dedupe yet (a later "reminder" email
 * about the same real event produces a second row). This collapses those:
 * within a group of entries sharing a normalised title + the same date, it
 * keeps the best row and sets every other non-dismissed row to `dismissed`
 * (reversible — nothing is deleted). Groups that are already fully dismissed
 * are left alone.
 */
import { getSupabaseClient } from "../../lib/supabase";

interface Row {
  id: string;
  title: string;
  kind: string;
  status: "pending_review" | "confirmed" | "dismissed";
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  created_at: string;
}

const APPLY = process.argv.includes("--apply");

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function anchorDate(r: Row): string {
  return (r.starts_at ?? "").slice(0, 10) || r.due_at || "no-date";
}

const STATUS_RANK: Record<Row["status"], number> = { confirmed: 0, pending_review: 1, dismissed: 2 };

/** Lower is better — this row is the one to keep. */
function score(r: Row): [number, number, number] {
  return [STATUS_RANK[r.status], r.ends_at ? 0 : 1, Date.parse(r.created_at)];
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id, title, kind, status, starts_at, ends_at, due_at, created_at")
    .order("created_at")
    .returns<Row[]>();
  if (error) throw error;

  const groups = new Map<string, Row[]>();
  for (const row of data) {
    const key = `${normTitle(row.title)}|${anchorDate(row)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }

  const losers: Row[] = [];
  for (const [, rows] of groups) {
    if (rows.length < 2) continue;
    if (rows.every((r) => r.status === "dismissed")) continue;

    const sorted = [...rows].sort((a, b) => cmp(score(a), score(b)));
    const keep = sorted[0];
    const drop = sorted.slice(1).filter((r) => r.status !== "dismissed");
    if (drop.length === 0) continue;

    console.log(`\n«${keep.title.slice(0, 68)}»  (${anchorDate(keep)})`);
    console.log(`  KEEP    ${keep.kind.padEnd(8)} ${keep.status.padEnd(14)} ${keep.created_at.slice(0, 19)}  ${keep.id}`);
    for (const r of drop) {
      console.log(`  dismiss ${r.kind.padEnd(8)} ${r.status.padEnd(14)} ${r.created_at.slice(0, 19)}  ${r.id}`);
      losers.push(r);
    }
  }

  console.log(`\n${losers.length} row(s) to dismiss across ${new Set(losers.map((r) => r.id)).size} entries.`);

  if (!APPLY) {
    console.log("Dry run — re-run with --apply to write.");
    return;
  }
  if (losers.length === 0) return;

  const { error: updErr } = await supabase
    .from("entries")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .in(
      "id",
      losers.map((r) => r.id)
    );
  if (updErr) throw updErr;
  console.log("Done — dismissed duplicates. They remain in the DB and can be restored via status.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
