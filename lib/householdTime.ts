import { TZDate } from "@date-fns/tz";

/**
 * The email-scan pipeline runs server-side with no browser to resolve local
 * wall-clock time (unlike the manual/chat paths, which compute the ISO
 * instant client-side). A fixed household timezone is the only way to get
 * the right UTC instant regardless of where the server process runs
 * (Vercel defaults to UTC). Override via HOUSEHOLD_TIMEZONE if needed.
 */
const HOUSEHOLD_TIMEZONE = process.env.HOUSEHOLD_TIMEZONE || "America/New_York";

/** Converts a local date (+ optional time) in the household's timezone to a
 * UTC-instant ISO string suitable for a `timestamptz` column. */
export function householdLocalToInstant(date: string, time?: string | null): string {
  const isoLocal = time ? `${date}T${time}:00` : `${date}T00:00:00`;
  return new TZDate(isoLocal, HOUSEHOLD_TIMEZONE).toISOString();
}
