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

/** The household-local calendar date ("YYYY-MM-DD") of a UTC-instant ISO
 * string — e.g. 2026-09-07T02:30:00Z is still "2026-09-06" in America/New_York.
 * Used by cross-email dedupe to decide whether two entries fall on the same
 * local day regardless of how their instants were stored. */
export function householdLocalDate(instantIso: string): string {
  const d = new TZDate(new Date(instantIso), HOUSEHOLD_TIMEZONE);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
