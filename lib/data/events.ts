import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { isEventVisibleToViewer } from "@/lib/visibility";
import { dropPastReviewEntries } from "@/lib/reviewExpiry";
import type { CalendarEvent } from "@/lib/types";
import type { EntryRow } from "@/lib/data/dbTypes";

/** Kinds that live on the calendar/schedule. Tasks never appear here. */
const SCHEDULE_KINDS = ["event", "advisory", "reminder"] as const;

/** entry_owners is embedded via PostgREST's nested select. */
type EntryRowWithOwners = EntryRow & { entry_owners: { family_member_id: string }[] | null };

const SELECT_WITH_OWNERS = "*, entry_owners(family_member_id)";

function mapEvent(row: EntryRowWithOwners): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    familyMemberId: row.subject_member_id,
    ownerMemberIds: (row.entry_owners ?? []).map((o) => o.family_member_id),
    scope: row.scope,
    busyStatus: row.busy_status,
    category: row.category ?? undefined,
    startsAt: row.starts_at ?? row.created_at,
    endsAt: row.ends_at ?? undefined,
    dueDate: row.due_at ?? undefined,
    allDay: row.is_all_day,
    location: row.location_text ?? undefined,
    locationLat: row.location_lat ?? undefined,
    locationLng: row.location_lng ?? undefined,
    notes: row.notes ?? undefined,
    arrivalAt: row.arrival_at ?? undefined,
    arrivalSource: row.arrival_source ?? undefined,
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
    recurrenceId: row.recurrence_id ?? undefined,
    recurrenceUntil: row.recurrence_until ?? undefined,
    linkedEntryId: row.linked_entry_id,
    createdAt: row.created_at,
  };
}

/** Nests reminders whose linked_entry_id points at another entry in the
 * set under that entry's `reminders`; leaves standalone reminders (and
 * reminders linked to something outside the set, e.g. a task) at top level. */
function attachReminders(events: CalendarEvent[]): CalendarEvent[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const top: CalendarEvent[] = [];
  for (const event of events) {
    if (event.kind === "reminder" && event.linkedEntryId && byId.has(event.linkedEntryId)) {
      const parent = byId.get(event.linkedEntryId)!;
      (parent.reminders ??= []).push(event);
    } else {
      top.push(event);
    }
  }
  return top;
}

export async function getEventsInRange(
  start: Date,
  end: Date,
  personId?: string | null
): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", SCHEDULE_KINDS)
    .not("starts_at", "is", null)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  let events = data.map(mapEvent);

  if (personId && personId !== "all") {
    // Filtering to one person doubles as "view as this person": apply the
    // visibility rule (an adult's own event stays private to them, a kid's
    // event shows for that kid + every adult) rather than a strict
    // assignee match. Whole-family entries (no subject) keep their
    // existing behavior — shown only under "All".
    const familyMembers = await getFamilyMembers();
    events = events.filter(
      (event) => event.familyMemberId && isEventVisibleToViewer(event, personId, familyMembers)
    );
  }

  return attachReminders(events);
}

export async function getUpcomingEvents(limit: number): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", SCHEDULE_KINDS)
    .not("starts_at", "is", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit)
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return attachReminders(data.map(mapEvent));
}

/** Wrapped in cache() since the root layout (notification badge) and the
 * Today page (approval summary line) both need this within one request.
 * Past-dated items are filtered out — see getPendingReviewEntries. */
export const getPendingReviewEvents = cache(async (): Promise<CalendarEvent[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", SCHEDULE_KINDS)
    .eq("status", "pending_review")
    .order("starts_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return dropPastReviewEntries(data.map(mapEvent));
});

/** Every pending-review entry, all four kinds, as CalendarEvent-shaped
 * rows (tasks carry `dueDate`; `startsAt` falls back to created_at and is
 * unused for them). Feeds the /review page's one unified list.
 *
 * Entries whose date has already passed are dropped — a scanned email
 * about last week's game isn't worth reviewing. They keep their
 * `pending_review` status in the DB; this is a view-time filter only. */
export const getPendingReviewEntries = cache(async (): Promise<CalendarEvent[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("status", "pending_review")
    .order("created_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return dropPastReviewEntries(data.map(mapEvent));
});

/** Confirmed events + advisories (not reminders) a reminder can be linked
 * to via EntryForm's "About" picker. Small household volume → a wide window. */
export async function getLinkableEntries(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", ["event", "task"])
    .neq("status", "dismissed")
    .order("starts_at", { nullsFirst: false })
    .limit(200)
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent);
}
