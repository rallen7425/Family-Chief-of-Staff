import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { isEventVisibleToViewer } from "@/lib/visibility";
import type { CalendarEvent } from "@/lib/types";
import type { EventRow } from "@/lib/data/dbTypes";

function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    familyMemberId: row.family_member_id,
    category: row.category ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    allDay: row.all_day,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
    recurrenceId: row.recurrence_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getEventsInRange(
  start: Date,
  end: Date,
  personId?: string | null
): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at")
    .returns<EventRow[]>();
  if (error) throw error;
  const events = data.map(mapEvent);

  if (!personId || personId === "all") return events;

  // Filtering to one person doubles as "view as this person": an
  // assigned event applies the visibility rule (an adult's own event
  // stays private to them, a kid's event is visible to that kid + every
  // adult) rather than a strict assignee match. Whole-family events
  // (no assignee) keep their existing behavior — shown only under "All",
  // unchanged — that's a separate, pre-existing convention this change
  // isn't meant to touch. Household event volume is tiny, so filtering
  // in JS after one fetch is simpler than expressing this in SQL.
  const familyMembers = await getFamilyMembers();
  return events.filter(
    (event) => event.familyMemberId && isEventVisibleToViewer(event, personId, familyMembers)
  );
}

export async function getUpcomingEvents(limit: number): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit)
    .returns<EventRow[]>();
  if (error) throw error;
  return data.map(mapEvent);
}

/** Wrapped in cache() since the root layout (notification badge) and the
 * Today page (approval summary line) both need this within one request. */
export const getPendingReviewEvents = cache(async (): Promise<CalendarEvent[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "pending_review")
    .order("starts_at")
    .returns<EventRow[]>();
  if (error) throw error;
  return data.map(mapEvent);
});
