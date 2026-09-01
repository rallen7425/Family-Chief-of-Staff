import { cache } from "react";
import { addDays, subDays, startOfDay, endOfDay, format } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { isEventVisibleToViewer } from "@/lib/visibility";
import { dropPastReviewEntries } from "@/lib/reviewExpiry";
import { buildSchedulePreview, type SchedulePreview } from "@/lib/schedulePreview";
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
    isCritical: row.is_critical ?? false,
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
    // Unconfirmed (pending_review) entries stay on the calendar, tagged in
    // the UI; only user-dismissed ones are hidden.
    .neq("status", "dismissed")
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

/** The Today screen's Schedule card. Today's remaining entries, rolling
 * forward one day when today is light (see `buildSchedulePreview`). Queries
 * a 3-day window so the "nothing for the next two days" case can be
 * detected. Server TZ is pinned in instrumentation.ts, so the day math is
 * household-local. */
export async function getTodaySchedulePreview(): Promise<SchedulePreview> {
  const now = new Date();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", SCHEDULE_KINDS)
    .not("starts_at", "is", null)
    .neq("status", "dismissed")
    .gte("starts_at", startOfDay(now).toISOString())
    .lte("starts_at", endOfDay(addDays(now, 2)).toISOString())
    .order("starts_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return buildSchedulePreview(attachReminders(data.map(mapEvent)), now);
}

/** Confirmed advisories, for the notifications feed. Time-bounding (show
 * for ~24h from detection) is applied in lib/notifications.ts, not here. */
export async function getActiveAdvisories(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("kind", "advisory")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent);
}

/** Confirmed events/reminders whose start (or arrival time, if set) lands in
 * the next `withinHours` and haven't already ended — the "act on this soon"
 * notification source. */
export async function getActionsSoon(withinHours: number): Promise<CalendarEvent[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
  // Query a slightly wider window than the horizon so an entry whose
  // arrival_at is inside the window but whose start is just past it still
  // gets considered; the JS filter below is authoritative.
  const queryEnd = new Date(horizon.getTime() + 3 * 60 * 60 * 1000);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .in("kind", ["event", "reminder"])
    .eq("status", "confirmed")
    .not("starts_at", "is", null)
    .gte("starts_at", startOfDay(now).toISOString())
    .lte("starts_at", queryEnd.toISOString())
    .order("starts_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent).filter((event) => {
    // The "act on this" moment is the arrival time if there is one, else the
    // start. Keep it only while that moment is still ahead and inside the
    // window — once it has passed, the action window is over.
    const trigger = new Date(event.arrivalAt ?? event.startsAt).getTime();
    return trigger >= now.getTime() && trigger <= horizon.getTime();
  });
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

/** Events + tasks a reminder can be linked to via EntryForm's "About"
 * picker. Bounded to a sane window — yesterday through +90d — so the picker
 * is a short, relevant list rather than every entry ever scanned. */
export async function getLinkableEntries(now: Date = new Date()): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const floor = startOfDay(subDays(now, 1));
  const ceil = endOfDay(addDays(now, 90));
  const floorDate = format(floor, "yyyy-MM-dd");

  const [events, tasks] = await Promise.all([
    supabase
      .from("entries")
      .select(SELECT_WITH_OWNERS)
      .in("kind", ["event", "advisory"])
      .neq("status", "dismissed")
      .gte("starts_at", floor.toISOString())
      .lte("starts_at", ceil.toISOString())
      .order("starts_at")
      .limit(40)
      .returns<EntryRowWithOwners[]>(),
    supabase
      .from("entries")
      .select(SELECT_WITH_OWNERS)
      .eq("kind", "task")
      .neq("status", "dismissed")
      .gte("due_at", floorDate)
      .order("due_at")
      .limit(40)
      .returns<EntryRowWithOwners[]>(),
  ]);
  if (events.error) throw events.error;
  if (tasks.error) throw tasks.error;
  return [...events.data, ...tasks.data].map(mapEvent);
}

export interface LinkableOption {
  id: string;
  title: string;
  when: string;
}

/** The linkable list already shaped for EntryForm's picker. Shared by the
 * Schedule and Today pages so a reminder's "About" control looks the same
 * wherever it's opened from. */
export async function getLinkableOptions(now: Date = new Date()): Promise<LinkableOption[]> {
  const entries = await getLinkableEntries(now);
  return entries.map((e) => {
    const anchor = e.kind === "task" ? e.dueDate : undefined;
    const when = anchor
      ? format(new Date(`${anchor}T00:00:00`), "MMM d")
      : e.allDay
        ? format(new Date(e.startsAt), "MMM d")
        : format(new Date(e.startsAt), "MMM d, h:mm a");
    return { id: e.id, title: e.title, when };
  });
}
