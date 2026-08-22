"use server";

import { revalidatePath } from "next/cache";
import { addWeeks, format, parse } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import { householdLocalToInstant } from "@/lib/householdTime";
import type { SourceDetail, SourceType } from "@/lib/types";

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

function revalidateScheduleViews() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

function generateWeeklyDates(firstDate: string, untilDate: string): string[] {
  const dates: string[] = [];
  let current = parse(firstDate, "yyyy-MM-dd", new Date());
  const until = parse(untilDate, "yyyy-MM-dd", new Date());
  while (current <= until) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addWeeks(current, 1);
  }
  return dates;
}

interface BuildRowsOptions {
  title: string;
  input: EventInput;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
}

interface EventRowInsert {
  title: string;
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

function buildEventRows({ title, input, sourceType, sourceDetail }: BuildRowsOptions): EventRowInsert[] {
  const base = {
    title,
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

export async function createEvent(input: EventInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.startsAt) return { error: "Date is required." };
  if (input.recurrence && input.recurrence.untilDate < input.recurrence.localDate) {
    return { error: "The repeat end date must be on or after the event date." };
  }

  const supabase = getSupabaseClient();
  const rows = buildEventRows({ title, input, sourceType: "manual" });
  const { error } = await supabase.from("events").insert(rows);
  if (error) return { error: error.message };

  revalidateScheduleViews();
  return {};
}

/** Chat-originated events keep the original message as provenance, per the
 * three-source-type convention (manual/chat/email_scan) — see EventInput. */
export async function createEventFromChat(
  input: EventInput,
  sourceDetail: SourceDetail
): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.startsAt) return { error: "Date is required." };
  if (input.recurrence && input.recurrence.untilDate < input.recurrence.localDate) {
    return { error: "The repeat end date must be on or after the event date." };
  }

  const supabase = getSupabaseClient();
  const rows = buildEventRows({ title, input, sourceType: "chat", sourceDetail });
  const { error } = await supabase.from("events").insert(rows);
  if (error) return { error: error.message };

  revalidateScheduleViews();
  return {};
}

export async function updateEvent(
  id: string,
  input: EventInput
): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.startsAt) return { error: "Date is required." };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({
      title,
      family_member_id: input.familyMemberId,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      all_day: input.allDay,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateScheduleViews();
  return {};
}

export async function confirmEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateScheduleViews();
}

export async function dismissEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateScheduleViews();
}
