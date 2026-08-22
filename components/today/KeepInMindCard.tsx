import Link from "next/link";
import { format } from "date-fns";
import { Bell, Cloud, Bookmark, Package, CircleAlert, ChevronRight } from "lucide-react";
import type { KeepInMindItem, Todo } from "@/lib/types";

const ICONS = {
  weather: Cloud,
  reminder: Bookmark,
  package: Package,
} as const;

const MAX_VISIBLE = 3;

type Row =
  | { kind: "system"; id: string; icon: KeepInMindItem["icon"]; body: string }
  | { kind: "todo"; id: string; body: string; overdue: boolean };

interface KeepInMindCardProps {
  items: KeepInMindItem[];
  urgentTodos: Todo[];
  pendingReviewCount: number;
}

export function KeepInMindCard({ items, urgentTodos, pendingReviewCount }: KeepInMindCardProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows: Row[] = [
    ...urgentTodos.map((todo) => ({
      kind: "todo" as const,
      id: todo.id,
      body: todo.title,
      overdue: Boolean(todo.dueDate && todo.dueDate < today),
    })),
    ...items.map((item) => ({ kind: "system" as const, id: item.id, icon: item.icon, body: item.body })),
  ];

  const visibleRows = rows.slice(0, MAX_VISIBLE);
  const hasMore = rows.length > MAX_VISIBLE;
  const hasContent = rows.length > 0 || pendingReviewCount > 0;

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={18} className="text-muted-text" />
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">
          Keep in mind
        </h2>
      </div>

      {!hasContent && <p className="text-[14px] text-muted-label">Nothing to flag right now.</p>}

      {visibleRows.length > 0 && (
        <ul className="flex flex-col gap-4">
          {visibleRows.map((row) => {
            if (row.kind === "todo") {
              return (
                <li key={`todo-${row.id}`} className="flex items-start gap-3">
                  <CircleAlert
                    size={20}
                    className={`mt-[1px] shrink-0 ${row.overdue ? "text-accent-berry" : "text-muted-text"}`}
                  />
                  <span className="text-[15px] font-medium leading-relaxed text-ink">{row.body}</span>
                </li>
              );
            }
            const Icon = ICONS[row.icon];
            return (
              <li key={`sys-${row.id}`} className="flex items-start gap-3">
                <Icon size={20} className="text-muted-text mt-[1px] shrink-0" />
                <span className="text-[15px] font-medium leading-relaxed text-ink">{row.body}</span>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <Link href="/todo" className="inline-block mt-4 text-[13px] font-semibold text-primary hover:underline">
          View all →
        </Link>
      )}

      {pendingReviewCount > 0 && (
        <Link
          href="/review"
          className={`flex items-center justify-between gap-2 rounded-input bg-primary/5 px-3.5 py-3 text-[14px] font-medium text-ink hover:bg-primary/10 transition-colors ${
            rows.length > 0 ? "mt-5" : ""
          }`}
        >
          <span>
            <span className="font-semibold text-primary">{pendingReviewCount}</span>{" "}
            new {pendingReviewCount === 1 ? "entry needs" : "entries need"} approval
          </span>
          <ChevronRight size={18} className="text-primary shrink-0" />
        </Link>
      )}
    </section>
  );
}
