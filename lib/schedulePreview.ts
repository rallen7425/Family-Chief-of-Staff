import { addDays, endOfDay, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

/**
 * The Today screen's Schedule card shows today's remaining entries, and rolls
 * forward one day when today is light. Within a day, entries are split into
 * two bands so a pile of all-day items can't push the timed events out of
 * view (they sort to midnight and used to eat a single shared cap):
 *
 *  - `heads` — all-day entries + every advisory, rendered as a compact muted
 *    strip. Advisories are the "catch the family before they leave" band, so
 *    they always sit here regardless of whether they carry a time.
 *  - `timed` — real timed events/reminders that haven't ended yet.
 *
 * Roll-forward:
 *  - today's bands always render (each with its own empty message)
 *  - if today has <= LOOKAHEAD_MAX entries total, tomorrow's bands render too
 *  - if today, tomorrow AND the day after are all empty, the card collapses
 *    to one combined "nothing for the next two days" message
 *
 * Server TZ is pinned in instrumentation.ts, so the date-fns day math here is
 * household-local.
 */
export const LOOKAHEAD_MAX = 3;
const TODAY_TIMED_CAP = 4;
const TODAY_HEADS_CAP = 4;
const TOMORROW_TIMED_CAP = 3;
const TOMORROW_HEADS_CAP = 3;

export interface DayBands {
  /** All-day entries + advisories (any time), as a muted strip. */
  heads: CalendarEvent[];
  /** Timed events/reminders still ahead today. */
  timed: CalendarEvent[];
}

export interface SchedulePreview {
  today: DayBands;
  /** null = today had more than LOOKAHEAD_MAX entries, so we didn't look ahead. */
  tomorrow: DayBands | null;
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

function isHeads(e: CalendarEvent): boolean {
  return e.kind === "advisory" || e.allDay;
}

function bandsForDay(
  events: CalendarEvent[],
  from: Date,
  to: Date,
  now: Date,
  headsCap: number,
  timedCap: number
): DayBands {
  const inDay = events.filter((e) => startsWithin(e, from, to) && notConcluded(e, now));
  return {
    heads: inDay.filter(isHeads).slice(0, headsCap),
    timed: inDay.filter((e) => !isHeads(e)).slice(0, timedCap),
  };
}

function bandCount(b: DayBands): number {
  return b.heads.length + b.timed.length;
}

export function buildSchedulePreview(events: CalendarEvent[], now: Date = new Date()): SchedulePreview {
  const d0 = startOfDay(now);
  const d1 = startOfDay(addDays(now, 1));
  const d2 = startOfDay(addDays(now, 2));
  const d3 = startOfDay(addDays(now, 3));

  const today = bandsForDay(events, d0, d1, now, TODAY_HEADS_CAP, TODAY_TIMED_CAP);
  const tomorrow = bandsForDay(events, d1, d2, d1, TOMORROW_HEADS_CAP, TOMORROW_TIMED_CAP);
  const dayAfter = bandsForDay(events, d2, d3, d2, TOMORROW_HEADS_CAP, TOMORROW_TIMED_CAP);

  return {
    today,
    tomorrow: bandCount(today) <= LOOKAHEAD_MAX ? tomorrow : null,
    emptyThroughDayAfter:
      bandCount(today) === 0 && bandCount(tomorrow) === 0 && bandCount(dayAfter) === 0,
  };
}
