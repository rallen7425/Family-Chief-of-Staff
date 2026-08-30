import { addDays, endOfDay, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

/**
 * The Today screen's Schedule card shows today's remaining events, and rolls
 * forward one day when today is light:
 *  - today's entries that haven't ended yet, always, under a "Today" heading
 *    (or a "nothing left today" message)
 *  - if today has <= LOOKAHEAD_MAX of those, also tomorrow's entries under a
 *    "Tomorrow" heading (or a "nothing tomorrow" message)
 *  - if today, tomorrow AND the day after are all empty, the card collapses
 *    to one combined "nothing for the next two days" message
 *
 * Server TZ is pinned in instrumentation.ts, so the date-fns day math here is
 * household-local.
 */
export const LOOKAHEAD_MAX = 2;
const TODAY_CAP = 4;
const TOMORROW_CAP = 3;

export interface SchedulePreview {
  today: CalendarEvent[];
  /** null = today had more than LOOKAHEAD_MAX, so we didn't look ahead. */
  tomorrow: CalendarEvent[] | null;
  /** today + tomorrow + the day after are all empty. */
  emptyThroughDayAfter: boolean;
}

function startsWithin(e: CalendarEvent, from: Date, to: Date): boolean {
  const s = new Date(e.startsAt).getTime();
  return s >= from.getTime() && s < to.getTime();
}

/** An entry is still shown until its end time passes; one with no end time
 * (and every all-day entry) runs through the end of its day. */
function notConcluded(e: CalendarEvent, now: Date): boolean {
  if (e.allDay) return true;
  const end = e.endsAt ? new Date(e.endsAt) : endOfDay(new Date(e.startsAt));
  return end.getTime() >= now.getTime();
}

export function buildSchedulePreview(events: CalendarEvent[], now: Date = new Date()): SchedulePreview {
  const d0 = startOfDay(now);
  const d1 = startOfDay(addDays(now, 1));
  const d2 = startOfDay(addDays(now, 2));
  const d3 = startOfDay(addDays(now, 3));

  const today = events.filter((e) => startsWithin(e, d0, d1) && notConcluded(e, now));
  const tomorrow = events.filter((e) => startsWithin(e, d1, d2));
  const dayAfter = events.filter((e) => startsWithin(e, d2, d3));

  return {
    today: today.slice(0, TODAY_CAP),
    tomorrow: today.length <= LOOKAHEAD_MAX ? tomorrow.slice(0, TOMORROW_CAP) : null,
    emptyThroughDayAfter: today.length === 0 && tomorrow.length === 0 && dayAfter.length === 0,
  };
}
