"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { buildEventRows } from "@/lib/events/recurrence";
import type { EventInput } from "@/lib/events/recurrence";
import type { SourceDetail } from "@/lib/types";

function revalidateScheduleViews() {
  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath("/review");
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
      // Deliberately not touching `status` here — editing a field is a
      // correction, not a review decision. A pending-review item stays
      // pending (confirmEvent/dismissEvent own that transition), and an
      // already-confirmed event stays confirmed.
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateScheduleViews();
  return {};
}

/** Hard-deletes an event. Distinct from dismissEvent (which sets
 * status='dismissed' to take a pending-review item out of the queue while
 * keeping the row): this is the user explicitly removing something from the
 * calendar for good. Closes the "no way to delete an event" gap.
 *
 * Deliberately does NOT revalidate here: the caller (DeleteEntrySection)
 * shows a "deleted" confirmation step, and an immediate revalidate would
 * unmount the modal's host row mid-flow. The client calls router.refresh()
 * once the user dismisses the confirmation. */
export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
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
