import { DayGroup } from "@/components/schedule/DayGroup";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface DayBucket {
  date: Date;
  events: CalendarEvent[];
}

interface MultiDayAgendaProps {
  days: DayBucket[];
  familyMembers: FamilyMember[];
}

export function MultiDayAgenda({ days, familyMembers }: MultiDayAgendaProps) {
  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col divide-y divide-border">
      {days.map(({ date, events }) => (
        <div key={date.toISOString()} className="py-4 first:pt-0 last:pb-0">
          <DayGroup date={date} events={events} familyMembers={familyMembers} />
        </div>
      ))}
    </section>
  );
}
