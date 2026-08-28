import { addWeeks, format, parse } from "date-fns";
import { householdLocalToInstant } from "@/lib/householdTime";
import type { EntryInput, SourceDetail, SourceType } from "@/lib/types";

/** Insert shape for `family_chief_of_staff.entries`, covering every kind.
 * entry_owners rows are handled separately by the action layer. */
export interface EntryRowInsert {
  kind: EntryInput["kind"];
  title: string;
  subject_member_id: string | null;
  notes: string | null;
  location_text: string | null;
  busy_status: "busy" | "free";
  scope: "personal" | "family";
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  is_all_day: boolean;
  arrival_at: string | null;
  arrival_source: "stated" | "inferred" | "manual" | null;
  linked_entry_id: string | null;
  recurrence_id: string | null;
  recurrence_until: string | null;
  status: "confirmed" | "pending_review";
  source_type: SourceType;
  source_detail: SourceDetail | null;
}

interface BuildRowsOptions {
  input: EntryInput;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
  status?: "confirmed" | "pending_review";
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
 * One insert row for a one-off entry; a weekly series (all sharing a fresh
 * `recurrence_id`) when `input.recurrence` is set and the kind is `event`.
 * Each occurrence's UTC instant is recomputed from its own local date via
 * the household timezone, so a series crossing a DST boundary keeps its
 * wall-clock time. Arrival times are only set on the one-off path — a
 * per-occurrence arrival for a long series is deferred (P2).
 */
export function buildEntryRows({ input, sourceType, sourceDetail, status = "confirmed" }: BuildRowsOptions): EntryRowInsert[] {
  const base = {
    kind: input.kind,
    title: input.title.trim(),
    subject_member_id: input.subjectMemberId,
    notes: input.notes?.trim() || null,
    location_text: input.location?.trim() || null,
    busy_status: input.busyStatus,
    scope: input.scope,
    category: input.category?.trim() || null,
    is_all_day: input.allDay,
    linked_entry_id: input.linkedEntryId ?? null,
    status,
    source_type: sourceType,
    source_detail: sourceDetail ?? null,
  };

  const recurring = input.kind === "event" && input.recurrence;
  if (!recurring) {
    return [
      {
        ...base,
        starts_at: input.startsAt ?? null,
        ends_at: input.endsAt ?? null,
        due_at: input.dueAt ?? null,
        arrival_at: input.arrivalAt ?? null,
        arrival_source: input.arrivalSource ?? null,
        recurrence_id: null,
        recurrence_until: null,
      },
    ];
  }

  const { localDate, localStartTime, localEndTime, untilDate } = input.recurrence!;
  const dates = generateWeeklyDates(localDate, untilDate);
  const recurrenceId = crypto.randomUUID();
  return dates.map((date) => ({
    ...base,
    starts_at: householdLocalToInstant(date, localStartTime),
    ends_at: localEndTime ? householdLocalToInstant(date, localEndTime) : null,
    due_at: null,
    arrival_at: null,
    arrival_source: null,
    recurrence_id: recurrenceId,
    recurrence_until: untilDate,
  }));
}
