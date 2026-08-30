import Link from "next/link";
import { Check } from "lucide-react";
import type { Todo, FamilyMember } from "@/lib/types";
import { ACCENT_HEX } from "@/lib/colors";

interface NeedsDoingCardProps {
  todos: Todo[];
  familyMembers: FamilyMember[];
}

export function NeedsDoingCard({ todos, familyMembers }: NeedsDoingCardProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="mb-6">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">To Do</h2>
      </div>
      {todos.length === 0 && <p className="text-[14px] text-muted-label">All caught up.</p>}
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
              <span
                className={`flex-1 text-[16px] font-medium ${
                  todo.completed ? "text-muted-label line-through decoration-muted-label/50" : "text-ink"
                }`}
              >
                {todo.title}
              </span>
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
      <div className="flex justify-end mt-3.5">
        <Link href="/todo" className="text-[13px] font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>
    </section>
  );
}
