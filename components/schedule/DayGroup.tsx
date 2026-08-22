import { format, isSameDay } from "date-fns";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";

interface DayGroupProps {
  date: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
  showDateHeader?: boolean;
}

export function DayGroup({ date, events, familyMembers, showDateHeader = true }: DayGroupProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));
  const isToday = isSameDay(date, new Date());

  return (
    <div>
      {showDateHeader && (
        <div className="flex items-baseline gap-2 mb-3">
          <h3
            className={`text-[13px] font-bold uppercase tracking-wide ${
              isToday ? "text-primary" : "text-muted-text"
            }`}
          >
            {format(date, "EEE")}
          </h3>
          <span className={`text-[13px] ${isToday ? "text-primary font-semibold" : "text-muted-label"}`}>
            {format(date, "MMM d")}
          </span>
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-[14px] text-muted-label pb-4">No events</p>
      ) : (
        <div className="flex flex-col gap-5 pb-2">
          {events.map((event) => {
            const member = event.familyMemberId ? memberById.get(event.familyMemberId) : undefined;
            return (
              <div key={event.id} className="flex gap-4 items-start">
                <div className="w-14 text-[13px] text-muted-label font-medium pt-0.5 shrink-0 text-right">
                  {event.allDay ? "All day" : format(new Date(event.startsAt), "h:mma").toLowerCase()}
                </div>
                <div
                  className={`w-[3px] self-stretch rounded-full mt-0.5 ${
                    member ? ACCENT_BG[member.accentColor] : "bg-border"
                  }`}
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-[16px] text-ink leading-tight mb-0.5">{event.title}</h4>
                  {event.location && <p className="text-[13px] text-muted-label">{event.location}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
