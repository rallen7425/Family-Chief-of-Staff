import Link from "next/link";
import { format } from "date-fns";
import type { KeepInMindItem, Todo } from "@/lib/types";
import { KeepInMindSystemRow } from "@/components/today/KeepInMindSystemRow";

type Row =
  | { kind: "todo"; id: string; body: string; overdue: boolean }
  | { kind: "system"; id: string; body: string }
  | { kind: "review"; id: string; body: string };

interface KeepInMindCardProps {
  items: KeepInMindItem[];
  urgentTodos: Todo[];
  pendingReviewCount: number;
}

/** Hard cap on visible rows so the card can't push the Schedule card
 * below the fold on mobile — the rest live behind "View all". */
const MAX_VISIBLE = 4;

/**
 * "Notifications" — a deliberately condensed strip: every entry (urgent
 * todos, system flags, and the pending-review count) is one compact,
 * tappable row with a small colored dot, no per-kind icon treatment and no
 * tinted sub-tile. Capped at four rows so Schedule (and at least its first
 * item) stays visible on a phone without scrolling. "View all" (to the full
 * /notifications page) sits bottom-right on its own line.
 */
export function KeepInMindCard({ items, urgentTodos, pendingReviewCount }: KeepInMindCardProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows: Row[] = [
    ...urgentTodos.map((todo) => ({
      kind: "todo" as const,
      id: todo.id,
      body: todo.title,
      overdue: Boolean(todo.dueDate && todo.dueDate < today),
    })),
    ...items.map((item) => ({ kind: "system" as const, id: item.id, body: item.body })),
    ...(pendingReviewCount > 0
      ? [
          {
            kind: "review" as const,
            id: "review",
            body: `${pendingReviewCount} new ${
              pendingReviewCount === 1 ? "entry needs" : "entries need"
            } approval`,
          },
        ]
      : []),
  ];

  // Keep the review nudge visible even when it would fall outside the cap —
  // it's the one row that isn't also shown elsewhere on this screen.
  const reviewRow = rows.find((row) => row.kind === "review");
  const rest = rows.filter((row) => row.kind !== "review");
  const visibleRows: Row[] =
    rows.length <= MAX_VISIBLE
      ? rows
      : reviewRow
        ? [...rest.slice(0, MAX_VISIBLE - 1), reviewRow]
        : rest.slice(0, MAX_VISIBLE);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <section className="bg-surface rounded-card pt-3 px-4 pb-2.5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">Notifications</h2>
        {rows.length > 0 && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full min-w-[16px] text-center px-1.5 py-px">
            {rows.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-muted-label">Nothing to flag right now.</p>
      ) : (
        <>
          <div className="flex flex-col">
            {visibleRows.map((row) => {
              if (row.kind === "system") {
                return <KeepInMindSystemRow key={`sys-${row.id}`} body={row.body} />;
              }
              const href = row.kind === "review" ? "/review" : "/todo";
              const dotClass =
                row.kind === "review"
                  ? "bg-primary"
                  : row.kind === "todo" && row.overdue
                    ? "bg-accent-berry"
                    : "bg-muted-text";
              return (
                <Link
                  key={`${row.kind}-${row.id}`}
                  href={href}
                  className="w-full flex items-center gap-[9px] py-[5px]"
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{row.body}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex justify-end mt-0.5">
            <Link
              href="/notifications"
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              {hiddenCount > 0 ? `View all (${hiddenCount} more) →` : "View all →"}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
