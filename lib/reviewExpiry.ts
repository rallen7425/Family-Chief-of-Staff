import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { EntryKind } from "@/lib/types";

/**
 * A pending-review entry whose date has already passed is noise — approving
 * a game that happened last week does nothing useful. These helpers decide
 * "is this in the past" so the review queue (and the badge counts that feed
 * it) can drop expired items. Nothing here writes: expired rows stay
 * `pending_review` in the DB, they're just filtered out of the review views.
 *
 * "Past" is measured against the household's wall clock, matching
 * `lib/householdTime.ts` — the server runs in UTC, so a naive `new Date()`
 * comparison would expire "today" items hours early (or late).
 */
const HOUSEHOLD_TIMEZONE = process.env.HOUSEHOLD_TIMEZONE || "America/New_York";

/** `YYYY-MM-DD` for the given instant in the household's timezone. */
function householdDay(instant: Date): string {
  return format(new TZDate(instant.getTime(), HOUSEHOLD_TIMEZONE), "yyyy-MM-dd");
}

/** The date fields the expiry check reads. `CalendarEvent` (the review
 * queue's row shape, all four kinds) already satisfies this. */
export interface ExpiryCheckable {
  kind: EntryKind;
  /** ISO datetime — always populated for schedule kinds. */
  startsAt?: string;
  /** ISO datetime — optional end for events / advisory ranges. */
  endsAt?: string;
  /** `YYYY-MM-DD` — tasks (and deadline-style reminders). */
  dueDate?: string;
  allDay?: boolean;
}

/**
 * True when the entry's date is before "now" in the household timezone:
 *  - task            → due date is before today (no due date never expires)
 *  - all-day schedule → its calendar day is before today
 *  - timed schedule   → its end (or start) instant is before now
 */
export function isPastReviewEntry(entry: ExpiryCheckable, now: Date = new Date()): boolean {
  const today = householdDay(now);

  if (entry.kind === "task") {
    return entry.dueDate != null && entry.dueDate < today;
  }

  const ref = entry.endsAt ?? entry.startsAt;
  if (!ref) return false;

  if (entry.allDay) {
    return householdDay(new Date(ref)) < today;
  }
  return new Date(ref).getTime() < now.getTime();
}

/** Convenience: keep only the entries that haven't passed yet. */
export function dropPastReviewEntries<T extends ExpiryCheckable>(entries: T[], now: Date = new Date()): T[] {
  return entries.filter((entry) => !isPastReviewEntry(entry, now));
}
