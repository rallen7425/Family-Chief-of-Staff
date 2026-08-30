"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getMemberDetails } from "@/lib/data/memberDetails";
import type { MemberDetail } from "@/lib/types";

function revalidate() {
  revalidatePath("/family");
  revalidatePath("/profile");
}

/** Client-callable read (the details dialog opens on demand). */
export async function listMemberDetails(memberId: string): Promise<MemberDetail[]> {
  return getMemberDetails(memberId);
}

export async function addDetail(input: {
  familyMemberId: string;
  label: string;
  value: string;
}): Promise<{ error?: string }> {
  if (!input.label.trim() || !input.value.trim()) return { error: "Both fields are required." };
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_details").insert({
    family_member_id: input.familyMemberId,
    label: input.label.trim(),
    value: input.value.trim(),
    source: "manual",
  });
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
