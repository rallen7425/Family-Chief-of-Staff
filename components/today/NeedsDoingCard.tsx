import Link from "next/link";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { NeedsDoingList } from "@/components/today/NeedsDoingList";

interface NeedsDoingCardProps {
  todos: CalendarEvent[];
  familyMembers: FamilyMember[];
}

export function NeedsDoingCard({ todos, familyMembers }: NeedsDoingCardProps) {
  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="mb-6">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">To Do</h2>
      </div>
      <NeedsDoingList todos={todos} familyMembers={familyMembers} />
      <div className="flex justify-end mt-3.5">
        <Link href="/todo" className="text-[13px] font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>
    </section>
  );
}
