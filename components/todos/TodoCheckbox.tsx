"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleTodo } from "@/lib/actions/todos";

interface TodoCheckboxProps {
  id: string;
  completed: boolean;
}

export function TodoCheckbox({ id, completed }: TodoCheckboxProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => toggleTodo(id, !completed));
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
