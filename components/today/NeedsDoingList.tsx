"use client";

import { useState } from "react";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_HEX } from "@/lib/colors";
import { TodoCheckbox } from "@/components/todos/TodoCheckbox";
import { EventRow } from "@/components/events/EventRow";
import { UnconfirmedTag } from "@/components/events/UnconfirmedTag";

interface NeedsDoingListProps {
  todos: CalendarEvent[];
  familyMembers: FamilyMember[];
}

/** Client-held copy of the server's initial (incomplete-only) todos list.
 * Checking a box updates this local copy in place rather than waiting on
 * the server revalidation that `getIncompleteTodos` triggers — that
 * refetch would otherwise exclude the just-completed item and yank it out
 * of the list before its strikethrough is ever seen. The full /todo page
 * doesn't need this: it fetches every status, so a completed item just
 * stays put. This freezes the preview against later prop updates for the
 * rest of this page view, which is the point — a full navigation/reload
 * still picks up the fresh incomplete-only set. */
export function NeedsDoingList({ todos, familyMembers }: NeedsDoingListProps) {
  const [items, setItems] = useState(todos);
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));

  function handleToggle(id: string, nextCompleted: boolean) {
    setItems((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completedAt: nextCompleted ? new Date().toISOString() : undefined } : todo
      )
    );
  }

  if (items.length === 0) {
    return <p className="text-[14px] text-muted-label">All caught up.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {items.map((todo) => {
        const member = todo.familyMemberId ? memberById.get(todo.familyMemberId) : undefined;
        const completed = Boolean(todo.completedAt);
        return (
          <div key={todo.id} className={`flex items-center gap-4 ${completed ? "opacity-60" : ""}`}>
            <TodoCheckbox
              id={todo.id}
              completed={completed}
              onToggle={(next) => handleToggle(todo.id, next)}
            />
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
  );
}
