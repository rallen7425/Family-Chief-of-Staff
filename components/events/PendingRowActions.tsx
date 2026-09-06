"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { confirmEntry, dismissEntry } from "@/lib/actions/entries";
import type { ItemStatus } from "@/lib/types";

/**
 * Inline Approve / Dismiss for a `pending_review` entry, shown directly on the
 * schedule + Today rows so the reviewer never has to detour through the
 * notifications pending list (or even open the details modal). Renders nothing
 * for confirmed entries. Sits *outside* the EventRow button — it must not
 * bubble into the row's open-modal click.
 */
export function PendingRowActions({
  entryId,
  status,
  className = "",
}: {
  entryId: string;
  status: ItemStatus;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending_review") return null;

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch {
        setError("Couldn’t save — try again.");
      }
    });
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => run(() => confirmEntry(entryId))}
        disabled={isPending}
        className="flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary text-white text-[12px] font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60"
      >
        <Check size={13} /> Approve
      </button>
      <button
        type="button"
        onClick={() => run(() => dismissEntry(entryId))}
        disabled={isPending}
        className="flex items-center gap-1 px-2.5 py-1 rounded-pill border border-border text-muted-text text-[12px] font-semibold hover:bg-mist transition-colors disabled:opacity-60"
      >
        <X size={13} /> Dismiss
      </button>
      {error && <span className="text-[12px] text-accent-berry font-medium">{error}</span>}
    </div>
  );
}
