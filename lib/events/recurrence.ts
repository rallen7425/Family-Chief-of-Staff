import { addWeeks, format, parse } from "date-fns";
import { householdLocalToInstant } from "@/lib/householdTime";
import type { EntryKind, SourceDetail, SourceType } from "@/lib/types";

export interface EventRecurrence {
  /** First occurrence's local date (YYYY-MM-DD) — the rest are generated
   * weekly from here. */
  localDate: string;
  /** Local start/end time (HH:mm), or undefined for an all-day series.
   * Recomputed per-occurrence via the household timezone rather than
   * reusing `startsAt`/`endsAt`, since a multi-month weekly series can
   * cross a DST boundary — adding a fixed 7×24h offset would silently
   * shift the wall-clock time after the transition. */
  localStartTime?: string;
  localEndTime?: string;
  /** Last possible occurrence date (YYYY-MM-DD), inclusive. */
  untilDate: string;
}

export interface EventInput {
  title: string;
  /** Omitted = "event". Advisory entries are visually distinct on the
   * calendar (muted, no person color) and default to whole-household. */
  kind?: EntryKind;
  familyMemberId: string | null;
  startsAt: string; // ISO — computed client-side so the browser's local timezone
  // resolves the wall-clock time correctly, since a Vercel server's default
  // timezone (UTC) would otherwise shift a naive "date+time" string. Used
  // as-is for a one-off event; ignored in favor of `recurrence` below when set.
  endsAt?: string; // ISO, same client-side computation as startsAt.
  allDay: boolean;
  location?: string;
  notes?: string;
  recurrence?: EventRecurrence;
}

export interface EventRowInsert {
  title: string;
  kind: EntryKind;
  family_member_id: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  status: "confirmed";
  source_type: SourceType;
  source_detail: SourceDetail | null;
  starts_at: string;
  ends_at: string | null;
  recurrence_id: string | null;
}

interface BuildRowsOptions {
  title: string;
  input: EventInput;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
}

/** Weekly-spaced local dates from `firstDate` through `untilDate` inclusive. */
export function generateWeeklyDates(firstDate: string, untilDate: string): string[] {
  const dates: string[] = [];
  let current = parse(firstDate, "yyyy-MM-dd", new Date());
  const until = parse(untilDate, "yyyy-MM-dd", new Date());
  while (current <= until) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addWeeks(current, 1);
  }
  return dates;
}

/**
 * One insert row for a one-off event; a weekly series (all sharing a fresh
 * `recurrence_id`) when `input.recurrence` is set. Each occurrence's UTC
 * instant is recomputed from its own local date via the household timezone,
 * not offset from the first, so a series crossing a DST boundary keeps its
 * wall-clock time.
 */
export function buildEventRows({
  title,
  input,
  sourceType,
  sourceDetail,
}: BuildRowsOptions): EventRowInsert[] {
  const base = {
    title,
    kind: input.kind ?? "event",
    family_member_id: input.familyMemberId,
    all_day: input.allDay,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    status: "confirmed" as const,
    source_type: sourceType,
    source_detail: sourceDetail ?? null,
  };

  if (!input.recurrence) {
    return [{ ...base, starts_at: input.startsAt, ends_at: input.endsAt || null, recurrence_id: null }];
  }

  const { localDate, localStartTime, localEndTime, untilDate } = input.recurrence;
  const dates = generateWeeklyDates(localDate, untilDate);
  const recurrenceId = crypto.randomUUID();
  return dates.map((date) => ({
    ...base,
    starts_at: householdLocalToInstant(date, localStartTime),
    ends_at: localEndTime ? householdLocalToInstant(date, localEndTime) : null,
    recurrence_id: recurrenceId,
  }));
}
