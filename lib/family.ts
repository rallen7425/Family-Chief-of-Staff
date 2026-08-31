import type { AccentColor, FamilyMember } from "@/lib/types";

/** Full age in whole years from a `YYYY-MM-DD` birthday, or null if the
 * string isn't a parseable date. Not calendar-year subtraction — the
 * month/day matter. */
export function ageInYears(birthday: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthday) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let age = now.getFullYear() - year;
  const beforeBirthdayThisYear =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

/** Adult = 18+. No birthday on file → treat as adult (don't hide
 * adult-only UI for a member whose birthday just isn't entered yet). */
export function computeIsAdult(birthday: string | null | undefined, now: Date = new Date()): boolean {
  const age = ageInYears(birthday, now);
  return age === null ? true : age >= 18;
}

/** The age class the UI and the HoH guard actually use: a birthday is
 * authoritative; without one, fall back to the stored `isAdult` flag
 * (so existing kids without a birthday on file don't read as adults). */
export function effectiveIsAdult(
  member: { birthday?: string | null; isAdult: boolean },
  now: Date = new Date()
): boolean {
  return member.birthday ? computeIsAdult(member.birthday, now) : member.isAdult;
}

/** "Rick Allen" -> "RA", "Ben" -> "B". Up to two letters. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** True when another member (not `exceptId`) already uses `color` — the
 * Edit Member conflict warning. */
export function colorInUseByOthers(
  members: FamilyMember[],
  color: AccentColor,
  exceptId: string | null
): boolean {
  return members.some((m) => m.id !== exceptId && m.accentColor === color);
}
