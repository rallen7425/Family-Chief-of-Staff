import Link from "next/link";
import { Filter, Info } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";
import { EventRow } from "@/components/events/EventRow";

interface ScheduleCardProps {
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
}

export function ScheduleCard({ events, familyMembers }: ScheduleCardProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">Schedule</h2>
        <div className="flex items-center gap-4">
          <Link
            href="/schedule"
            aria-label="Filter"
            className="text-muted-text hover:text-primary transition-colors"
          >
            <Filter size={18} />
          </Link>
          <Link href="/schedule" className="text-[13px] font-semibold text-primary hover:underline">
            View Calendar
          </Link>
        </div>
      </div>
      {events.length === 0 && <p className="text-[14px] text-muted-label">Nothing coming up.</p>}
      <div className="flex flex-col gap-6">
        {events.map((event) => {
          const isAdvisory = event.kind === "advisory";
          const member = event.familyMemberId ? memberById.get(event.familyMemberId) : undefined;
          const startDate = new Date(event.startsAt);
          // This preview shows the next few *upcoming* events, not strictly
          // "today's" — without a day label, an event on a day with nothing
          // scheduled today reads as if it's happening today.
          const dayLabel = isToday(startDate) ? null : isTomorrow(startDate) ? "Tomorrow" : format(startDate, "EEE");
          return (
            <EventRow key={event.id} event={event} familyMembers={familyMembers}>
              <div className="flex gap-4 items-start relative">
                <div className="w-14 shrink-0 text-right leading-tight pt-1">
                  {dayLabel && (
                    <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{dayLabel}</div>
                  )}
                  <div className="text-[13px] text-muted-label font-medium">
                    {event.allDay ? "All day" : format(startDate, "h:mma").toLowerCase()}
                  </div>
                </div>
                <div
                  className={`w-[3px] self-stretch rounded-full mt-1 ${
                    isAdvisory ? "bg-border" : member ? ACCENT_BG[member.accentColor] : "bg-border"
                  }`}
                />
                <div className="flex-1 pb-2">
                  {isAdvisory ? (
                    <p className="flex items-center gap-1.5 text-[15px] text-muted-text leading-tight">
                      <Info size={14} className="shrink-0 text-muted-label" />
                      {event.title}
                    </p>
                  ) : (
                    <h3 className="font-semibold text-[17px] text-ink leading-tight mb-1">{event.title}</h3>
                  )}
                  {event.location && <p className="text-[14px] text-muted-label">{event.location}</p>}
                </div>
              </div>
            </EventRow>
          );
        })}
      </div>
    </section>
  );
}
