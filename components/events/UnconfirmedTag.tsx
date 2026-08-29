import type { ItemStatus } from "@/lib/types";

/**
 * Marks a calendar entry that's still `pending_review` — it shows on the
 * schedule (so nothing is hidden while it waits) but is visually flagged as
 * not-yet-confirmed. Renders nothing for confirmed entries.
 */
export function UnconfirmedTag({ status, className = "" }: { status: ItemStatus; className?: string }) {
  if (status !== "pending_review") return null;
  return (
    <span
      className={`inline-block shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-mist text-muted-label border border-border ${className}`}
    >
      Unconfirmed
    </span>
  );
}
