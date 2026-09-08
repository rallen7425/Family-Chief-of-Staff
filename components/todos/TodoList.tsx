import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_HEX } from "@/lib/colors";
import { TodoCheckbox } from "@/components/todos/TodoCheckbox";
import { EventRow } from "@/components/events/EventRow";
import { UnconfirmedTag } from "@/components/events/UnconfirmedTag";

interface TodoListProps {
  todos: CalendarEvent[];
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
          const completed = Boolean(todo.completedAt);
          return (
            <div key={todo.id} className={`flex items-center gap-4 ${completed ? "opacity-60" : ""}`}>
              <TodoCheckbox id={todo.id} completed={completed} />
              <div className="flex-1 min-w-0">
                <EventRow event={todo} familyMembers={familyMembers}>
                  <span
                    className={`text-[16px] font-medium ${
                      completed ? "text-muted-label line-through decoration-muted-label/50" : "text-ink"
                    }`}
                  >
                    {todo.title}
                  </span>
                  <UnconfirmedTag status={todo.status} className="ml-2 align-middle" />
                </EventRow>
              </div>
              {member && !completed && (
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
