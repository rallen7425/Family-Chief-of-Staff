import { getSupabaseClient } from "@/lib/supabase";
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
  };
}

export async function getEventsInRange(
  start: Date,
  end: Date,
  personId?: string | null
): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("events")
    .select("*")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  if (personId && personId !== "all") {
    query = query.eq("family_member_id", personId);
  }
  const { data, error } = await query.returns<EventRow[]>();
  if (error) throw error;
  return data.map(mapEvent);
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

export async function getPendingReviewEvents(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "pending_review")
    .order("starts_at")
    .returns<EventRow[]>();
  if (error) throw error;
  return data.map(mapEvent);
}
