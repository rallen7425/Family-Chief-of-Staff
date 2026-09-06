/**
 * US federal holidays, by rule. Schools and offices in the US are generally
 * closed on these days — the email-scan pipeline uses this to tell a
 * "no school / campus closed" notice for a holiday apart from a real event,
 * and to annotate the extraction prompt with the holiday name for a given
 * date. Deliberately rule-based (no year table to maintain) and operates on
 * a household-local `YYYY-MM-DD` string, not a `Date`, to stay clear of
 * timezone drift.
 */

/** 1-indexed nth (1..5) `weekday` (0=Sun..6=Sat) of `month` (1..12). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

/** Day-of-month of the last `weekday` (0=Sun..6=Sat) in `month` (1..12). */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return lastDay - ((lastDow - weekday + 7) % 7);
}

/**
 * The name of the US federal holiday falling on `isoDate` ("YYYY-MM-DD"),
 * or null. Uses the actual holiday date, not the observed (shifted to
 * Mon/Fri) date — schools follow the real date, and a weekend holiday
 * doesn't move a school day anyway.
 */
export function federalHolidayOn(isoDate: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const fixed: Record<string, string> = {
    "1-1": "New Year's Day",
    "6-19": "Juneteenth",
    "7-4": "Independence Day",
    "11-11": "Veterans Day",
    "12-25": "Christmas Day",
  };
  const fixedHit = fixed[`${month}-${day}`];
  if (fixedHit) return fixedHit;

  // [month, weekday (0=Sun), nth, name]
  const floating: [number, number, number, string][] = [
    [1, 1, 3, "Martin Luther King Jr. Day"], // 3rd Mon Jan
    [2, 1, 3, "Presidents' Day"], // 3rd Mon Feb
    [9, 1, 1, "Labor Day"], // 1st Mon Sep
    [10, 1, 2, "Columbus Day"], // 2nd Mon Oct
    [11, 4, 4, "Thanksgiving"], // 4th Thu Nov
  ];
  for (const [fMonth, weekday, nth, name] of floating) {
    if (month === fMonth && nthWeekdayOfMonth(year, fMonth, weekday, nth) === day) return name;
  }

  if (month === 5 && lastWeekdayOfMonth(year, 5, 1) === day) return "Memorial Day";

  return null;
}

/** Whether `isoDate` ("YYYY-MM-DD") is a US federal holiday. */
export function isFederalHoliday(isoDate: string): boolean {
  return federalHolidayOn(isoDate) !== null;
}
