"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import type { SourceDetail } from "@/lib/types";

export interface EventInput {
  title: string;
  familyMemberId: string | null;
  startsAt: string; // ISO — computed client-side so the browser's local timezone
  // resolves the wall-clock time correctly, since a Vercel server's default
  // timezone (UTC) would otherwise shift a naive "date+time" string.
  allDay: boolean;
  location?: string;
  notes?: string;
}

function revalidateScheduleViews() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function createEvent(input: EventInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.startsAt) return { error: "Date is required." };

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").insert({
    title,
    family_member_id: input.familyMemberId,
    starts_at: input.startsAt,
    all_day: input.allDay,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    status: "confirmed",
    source_type: "manual",
  });
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

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").insert({
    title,
    family_member_id: input.familyMemberId,
    starts_at: input.startsAt,
    all_day: input.allDay,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    status: "confirmed",
    source_type: "chat",
    source_detail: sourceDetail,
  });
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
