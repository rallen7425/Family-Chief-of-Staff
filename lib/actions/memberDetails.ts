"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getMemberDetails } from "@/lib/data/memberDetails";
import type { MemberDetail } from "@/lib/types";

function revalidate() {
  revalidatePath("/family", "layout");
  revalidatePath("/profile", "layout");
}

/** Client-callable read (the details dialog opens on demand). */
export async function listMemberDetails(memberId: string): Promise<MemberDetail[]> {
  return getMemberDetails(memberId);
}

const ACTIVITY_CATEGORIES = ["game", "practice", "rehearsal", "appointment", "other"] as const;

function clampBuffer(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(180, Math.round(n)));
}

export async function addDetail(input: {
  familyMemberId: string;
  label: string;
  value: string;
  category?: string | null;
  arrivalBufferMinutes?: number | null;
}): Promise<{ error?: string }> {
  if (!input.label.trim() || !input.value.trim()) return { error: "Both fields are required." };
  const category =
    input.category && ACTIVITY_CATEGORIES.includes(input.category as (typeof ACTIVITY_CATEGORIES)[number])
      ? input.category
      : null;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_details").insert({
    family_member_id: input.familyMemberId,
    label: input.label.trim(),
    value: input.value.trim(),
    category,
    arrival_buffer_minutes: clampBuffer(input.arrivalBufferMinutes),
    source: "manual",
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

/** Sets the per-activity arrival buffer + category on one detail row. A
 * null buffer means "fall back to the category rule / general default". */
export async function setDetailActivity(
  id: string,
  input: { category?: string | null; arrivalBufferMinutes?: number | null }
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.category !== undefined) {
    patch.category =
      input.category &&
      ACTIVITY_CATEGORIES.includes(input.category as (typeof ACTIVITY_CATEGORIES)[number])
        ? input.category
        : null;
  }
  if (input.arrivalBufferMinutes !== undefined) {
    patch.arrival_buffer_minutes = clampBuffer(input.arrivalBufferMinutes);
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_details").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function updateDetail(id: string, value: string): Promise<{ error?: string }> {
  if (!value.trim()) return { error: "Can't be blank." };
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("member_details")
    .update({ value: value.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}

/** Soft toggle — an ignored item is skipped by downstream logic but stays
 * in the list (struck through) so it can be brought back. */
export async function toggleDetailIgnored(id: string, ignored: boolean): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("member_details")
    .update({ ignored, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function removeDetail(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_details").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}
