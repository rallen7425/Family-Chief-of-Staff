import { MOCK_EVENTS } from "@/lib/mockData";
import type { CalendarEvent } from "@/lib/types";

/** Phase 1: backed by in-memory mock data. Swaps to a Supabase query in Phase 3. */

export async function getEventsInRange(
  start: Date,
  end: Date,
  personId?: string | null
): Promise<CalendarEvent[]> {
  return MOCK_EVENTS.filter((event) => {
    const startsAt = new Date(event.startsAt);
    if (startsAt < start || startsAt >= end) return false;
    if (personId && personId !== "all" && event.familyMemberId !== personId) return false;
    return true;
  }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function getUpcomingEvents(limit: number): Promise<CalendarEvent[]> {
  const now = new Date();
  return MOCK_EVENTS.filter((event) => new Date(event.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit);
}

export async function getPendingReviewEvents(): Promise<CalendarEvent[]> {
  return MOCK_EVENTS.filter((event) => event.status === "pending_review");
}
