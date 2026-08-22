import { Check } from "lucide-react";
import type { FamilyMember, Todo } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";

interface TodoListProps {
  todos: Todo[];
  familyMembers: FamilyMember[];
}

export function TodoList({ todos, familyMembers }: TodoListProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));

  if (todos.length === 0) {
    return (
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
        <p className="text-[14px] text-muted-label">All caught up.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-5">
        {todos.map((todo) => {
          const member = todo.familyMemberId ? memberById.get(todo.familyMemberId) : undefined;
          return (
            <div key={todo.id} className={`flex items-center gap-4 ${todo.completed ? "opacity-60" : ""}`}>
              <div
                className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                  todo.completed ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {todo.completed && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <span
                  className={`text-[16px] font-medium ${
                    todo.completed ? "text-muted-label line-through decoration-muted-label/50" : "text-ink"
                  }`}
                >
                  {todo.title}
                </span>
                {todo.status === "pending_review" && (
                  <span className="ml-2 text-[11px] font-semibold text-primary uppercase tracking-wide">
                    Needs review
                  </span>
                )}
              </div>
              {member && !todo.completed && (
                <div className={`w-2 h-2 rounded-full shrink-0 ${ACCENT_BG[member.accentColor]}`} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
