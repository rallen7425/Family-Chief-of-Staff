import type { FamilyMember, Todo } from "@/lib/types";
import { ACCENT_HEX } from "@/lib/colors";
import { TodoCheckbox } from "@/components/todos/TodoCheckbox";

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
              <TodoCheckbox id={todo.id} completed={todo.completed} />
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
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ACCENT_HEX[member.accentColor] }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
