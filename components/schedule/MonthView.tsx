import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthViewProps {
  month: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
  buildDayHref: (date: Date) => string;
}

export function MonthView({ month, events, familyMembers, buildDayHref }: MonthViewProps) {
  const memberById = new Map(familyMembers.map((member) => [member.id, member]));
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-muted-label uppercase">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(new Date(event.startsAt), day));
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);

          return (
            <Link
              key={day.toISOString()}
              href={buildDayHref(day)}
              className="flex flex-col items-center gap-1 py-1.5 rounded-input hover:bg-mist transition-colors"
            >
              <span
                className={
                  isToday
                    ? "w-7 h-7 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center justify-center"
                    : `w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium ${
                        inMonth ? "text-ink" : "text-muted-label/50"
                      }`
                }
              >
                {format(day, "d")}
              </span>
              <div className="flex gap-0.5 h-1.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const member = event.familyMemberId ? memberById.get(event.familyMemberId) : undefined;
                  return (
                    <span
                      key={event.id}
                      className={`w-1.5 h-1.5 rounded-full ${member ? ACCENT_BG[member.accentColor] : "bg-border"}`}
                    />
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
