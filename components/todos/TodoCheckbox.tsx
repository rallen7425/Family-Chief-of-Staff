"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleTaskComplete } from "@/lib/actions/entries";

interface TodoCheckboxProps {
  id: string;
  completed: boolean;
  /** Fires synchronously on click, before the server round-trip — lets a
   * parent list apply an optimistic update immediately (see
   * NeedsDoingList, which freezes its list against the server's
   * incomplete-only refetch so a checked item shows struck-through instead
   * of instantly disappearing, matching the full /todo page). */
  onToggle?: (nextCompleted: boolean) => void;
}

export function TodoCheckbox({ id, completed, onToggle }: TodoCheckboxProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    onToggle?.(!completed);
    startTransition(() => toggleTaskComplete(id, !completed));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={completed}
      aria-label={completed ? "Mark as not done" : "Mark as done"}
      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        completed ? "bg-primary border-primary" : "border-border hover:border-primary/50"
      } ${isPending ? "opacity-60" : ""}`}
    >
      {completed && <Check size={14} className="text-white" strokeWidth={3} />}
    </button>
  );
}
