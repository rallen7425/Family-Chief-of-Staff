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
 * UTC-instant ISO string suitable for a `timestamptz` column. Normalized to
 * canonical `...Z` form (TZDate's own `toISOString()` returns offset form like
 * `...-05:00` — a valid instant, but inconsistent with the client-computed
 * `new Date().toISOString()` values the manual/chat paths store). */
export function householdLocalToInstant(date: string, time?: string | null): string {
  const isoLocal = time ? `${date}T${time}:00` : `${date}T00:00:00`;
  const tzDate = new TZDate(isoLocal, HOUSEHOLD_TIMEZONE);
  return new Date(tzDate.getTime()).toISOString();
}
