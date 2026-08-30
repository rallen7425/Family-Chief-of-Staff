import Link from "next/link";
import { Filter, Info } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import type { SchedulePreview } from "@/lib/schedulePreview";
import { ACCENT_HEX } from "@/lib/colors";
import { EventRow } from "@/components/events/EventRow";
import { UnconfirmedTag } from "@/components/events/UnconfirmedTag";

interface ScheduleCardProps {
  preview: SchedulePreview;
  familyMembers: FamilyMember[];
}

function ScheduleEventRow({
  event,
  familyMembers,
  memberById,
}: {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  memberById: Map<string, FamilyMember>;
}) {
  const isAdvisory = event.kind === "advisory";
  const member = event.familyMemberId ? memberById.get(event.familyMemberId) : undefined;
  const startDate = new Date(event.startsAt);

  return (
    <EventRow event={event} familyMembers={familyMembers}>
      <div className="flex gap-4 items-start relative">
        <div className="w-14 shrink-0 text-right leading-tight pt-1">
          <div className="text-[13px] text-muted-label font-medium">
            {event.allDay ? "All day" : format(startDate, "h:mma").toLowerCase()}
          </div>
        </div>
        <div
          className={`w-[3px] self-stretch rounded-full mt-1 ${isAdvisory || !member ? "bg-border" : ""}`}
          style={!isAdvisory && member ? { background: ACCENT_HEX[member.accentColor] } : undefined}
        />
        <div className="flex-1 pb-2">
          {isAdvisory ? (
            <p className="flex items-center gap-1.5 text-[15px] text-muted-text leading-tight">
              <Info size={14} className="shrink-0 text-muted-label" />
              {event.title}
              <UnconfirmedTag status={event.status} />
            </p>
          ) : (
            <div className="flex items-start gap-1.5 flex-wrap mb-1">
              <h3 className="font-semibold text-[17px] text-ink leading-tight">{event.title}</h3>
              <UnconfirmedTag status={event.status} className="mt-1" />
            </div>
          )}
          {event.location && <p className="text-[14px] text-muted-label">{event.location}</p>}
        </div>
      </div>
    </EventRow>
  );
}

function DaySection({
  label,
  events,
  emptyMessage,
  familyMembers,
  memberById,
}: {
  label: string;
  events: CalendarEvent[];
  emptyMessage: string;
  familyMembers: FamilyMember[];
  memberById: Map<string, FamilyMember>;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-bold tracking-widest text-muted-label uppercase mb-3">{label}</h3>
      {events.length === 0 ? (
        <p className="text-[14px] text-muted-label">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {events.map((event) => (
            <ScheduleEventRow
              key={event.id}
              event={event}
              familyMembers={familyMembers}
              memberById={memberById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ScheduleCard({ preview, familyMembers }: ScheduleCardProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));
  const { today, tomorrow, emptyThroughDayAfter } = preview;

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">Schedule</h2>
        <Link
          href="/schedule"
          aria-label="Filter"
          className="text-muted-text hover:text-primary transition-colors"
        >
          <Filter size={18} />
        </Link>
      </div>

      {emptyThroughDayAfter ? (
        <p className="text-[14px] text-muted-label">
          Nothing on the schedule today or for the next two days.
        </p>
      ) : (
        <div className="flex flex-col gap-7">
          <DaySection
            label="Today"
            events={today}
            emptyMessage="Nothing left today."
            familyMembers={familyMembers}
            memberById={memberById}
          />
          {tomorrow !== null && (
            <DaySection
              label="Tomorrow"
              events={tomorrow}
              emptyMessage="Nothing tomorrow."
              familyMembers={familyMembers}
              memberById={memberById}
            />
          )}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Link href="/schedule" className="text-[13px] font-semibold text-primary hover:underline">
          View Schedule →
        </Link>
      </div>
    </section>
  );
}
