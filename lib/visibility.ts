import type { CalendarEvent, FamilyMember } from "@/lib/types";

/**
 * No login exists in this app, so there's no real access control here — this
 * is a display/filter convention: an adult's own event defaults to private to
 * them, a kid's event is visible to that kid plus every adult (not other
 * kids), and a whole-family event (no assignee) is visible to everyone.
 * Enforced only where a specific person is already being filtered to (see
 * getEventsInRange) — the unfiltered household view stays unfiltered.
 */
export function computeVisibleMemberIds(
  event: Pick<CalendarEvent, "familyMemberId">,
  familyMembers: FamilyMember[]
): string[] | "everyone" {
  if (!event.familyMemberId) return "everyone";
  const assignee = familyMembers.find((m) => m.id === event.familyMemberId);
  if (!assignee) return "everyone";
  if (assignee.isAdult) return [assignee.id];
  return [assignee.id, ...familyMembers.filter((m) => m.isAdult).map((m) => m.id)];
}

export function isEventVisibleToViewer(
  event: Pick<CalendarEvent, "familyMemberId">,
  viewerId: string,
  familyMembers: FamilyMember[]
): boolean {
  const visible = computeVisibleMemberIds(event, familyMembers);
  return visible === "everyone" || visible.includes(viewerId);
}

export function describeVisibility(
  event: Pick<CalendarEvent, "familyMemberId">,
  familyMembers: FamilyMember[]
): string {
  const visible = computeVisibleMemberIds(event, familyMembers);
  if (visible === "everyone") return "Everyone";
  const names = visible
    .map((id) => familyMembers.find((m) => m.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length === 1 ? `${names[0]} only` : names.join(", ");
}
