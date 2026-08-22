import { DayGroup } from "@/components/schedule/DayGroup";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
}

export function DayView({ date, events, familyMembers }: DayViewProps) {
  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <DayGroup date={date} events={events} familyMembers={familyMembers} showDateHeader={false} />
    </section>
  );
}
