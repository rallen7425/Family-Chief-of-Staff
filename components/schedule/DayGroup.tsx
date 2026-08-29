import { format, isSameDay } from "date-fns";
import { Bell } from "lucide-react";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";
import { EventRow } from "@/components/events/EventRow";
import { UnconfirmedTag } from "@/components/events/UnconfirmedTag";
import { AdvisorySummary } from "@/components/schedule/AdvisorySummary";

interface DayGroupProps {
  date: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
  showDateHeader?: boolean;
}

function ArrivalBadge({ event }: { event: CalendarEvent }) {
  if (!event.arrivalAt) return null;
  const blue = event.arrivalSource === "manual" || event.arrivalSource === "stated";
  return (
    <span
      className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
        blue ? "bg-[#EEF2FB] text-[#3B6FE5]" : "bg-[#F3EEF9] text-[#7C5CBF]"
      }`}
    >
      Arrive {format(new Date(event.arrivalAt), "h:mm a")}
    </span>
  );
}

function ReminderSubLine({ reminder }: { reminder: CalendarEvent }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted-label mt-1">
      <Bell size={12} className="shrink-0" />
      {reminder.title}
    </p>
  );
}

export function DayGroup({ date, events, familyMembers, showDateHeader = true }: DayGroupProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));
  const isToday = isSameDay(date, new Date());
  const advisories = events.filter((event) => event.kind === "advisory");
  const timedEvents = events.filter((event) => event.kind !== "advisory");

  return (
    <div>
      {showDateHeader && (
        <div className="flex items-baseline gap-2 mb-3">
          <h3
            className={`text-[13px] font-bold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-text"}`}
          >
            {format(date, "EEE")}
          </h3>
          <span className={`text-[13px] ${isToday ? "text-primary font-semibold" : "text-muted-label"}`}>
            {format(date, "MMM d")}
          </span>
        </div>
      )}
      <AdvisorySummary advisories={advisories} familyMembers={familyMembers} />
      {events.length === 0 ? (
        <p className="text-[14px] text-muted-label pb-4">No events</p>
      ) : timedEvents.length === 0 ? null : (
        <div className="flex flex-col gap-5 pb-2">
          {timedEvents.map((event) => {
            const member = event.familyMemberId ? memberById.get(event.familyMemberId) : undefined;
            const isStandaloneReminder = event.kind === "reminder";
            return (
              <EventRow key={event.id} event={event} familyMembers={familyMembers}>
                <div className="flex gap-4 items-start">
                  <div className="w-14 text-[13px] text-muted-label font-medium pt-0.5 shrink-0 text-right">
                    {event.allDay ? "All day" : format(new Date(event.startsAt), "h:mma").toLowerCase()}
                  </div>
                  <div
                    className={`w-[3px] self-stretch rounded-full mt-0.5 ${
                      isStandaloneReminder ? "bg-border" : member ? ACCENT_BG[member.accentColor] : "bg-border"
                    }`}
                  />
                  <div className="flex-1">
                    {isStandaloneReminder ? (
                      <p className="flex items-center gap-1.5 text-[14px] text-muted-text leading-tight">
                        <Bell size={13} className="shrink-0 text-muted-label" />
                        {event.title}
                        <UnconfirmedTag status={event.status} />
                      </p>
                    ) : (
                      <div className="flex items-start gap-1.5 flex-wrap mb-0.5">
                        <h4 className="font-semibold text-[16px] text-ink leading-tight">{event.title}</h4>
                        <UnconfirmedTag status={event.status} className="mt-0.5" />
                      </div>
                    )}
                    {event.location && <p className="text-[13px] text-muted-label">{event.location}</p>}
                    <ArrivalBadge event={event} />
                    {event.reminders?.map((r) => (
                      <ReminderSubLine key={r.id} reminder={r} />
                    ))}
                  </div>
                </div>
              </EventRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
