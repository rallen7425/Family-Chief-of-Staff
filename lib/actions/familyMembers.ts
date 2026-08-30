"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase";
import { computeIsAdult } from "@/lib/family";
import { ACTIVE_MEMBER_COOKIE } from "@/lib/activeMember";
import type { AccentColor } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidateProfileViews() {
  for (const p of ["/", "/profile", "/family", "/settings", "/schedule", "/todo"]) {
    revalidatePath(p);
  }
}

// ── full create / edit (the Edit Member sheet) ─────────────────────────────

export interface FamilyMemberInput {
  name: string;
  accentColor: AccentColor;
  relationship: string | null;
  birthday: string | null; // YYYY-MM-DD
  email: string | null;
  phone: string | null;
  school: string | null;
  grade: string | null;
}

function validate(input: FamilyMemberInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (input.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthday)) return "Enter a valid birthday.";
  if (input.email && !EMAIL_RE.test(input.email.trim())) return "Enter a valid email address.";
  if (input.phone) {
    const digits = input.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number.";
  }
  return null;
}

/** Age class decides which optional fields are kept — a child carries no
 * email/phone, an adult carries no school/grade (absent, not blank). */
function toRow(input: FamilyMemberInput) {
  const isAdult = computeIsAdult(input.birthday);
  return {
    name: input.name.trim(),
    accent_color: input.accentColor,
    relationship: input.relationship?.trim() || null,
    birthday: input.birthday || null,
    is_adult: isAdult,
    email: isAdult ? input.email?.trim() || null : null,
    phone: isAdult ? input.phone?.trim() || null : null,
    school: isAdult ? null : input.school?.trim() || null,
    grade: isAdult ? null : input.grade?.trim() || null,
  };
}

export async function saveFamilyMember(
  input: FamilyMemberInput,
  id?: string
): Promise<{ error?: string }> {
  const err = validate(input);
  if (err) return { error: err };
  const supabase = getSupabaseClient();

  if (id) {
    const { error } = await supabase.from("family_members").update(toRow(input)).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: last } = await supabase
      .from("family_members")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;
    const { error } = await supabase
      .from("family_members")
      .insert({ ...toRow(input), sort_order: nextOrder });
    if (error) return { error: error.message };
  }
  revalidateProfileViews();
  return {};
}

// ── single-field inline edits (My Profile) ────────────────────────────────

export interface ProfileFieldPatch {
  name?: string;
  relationship?: string;
  email?: string; // "" clears it
  phone?: string; // "" clears it
  accentColor?: AccentColor;
}

export async function updateProfileFields(
  id: string,
  patch: ProfileFieldPatch
): Promise<{ error?: string }> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    if (!patch.name.trim()) return { error: "Name can't be blank." };
    row.name = patch.name.trim();
  }
  if (patch.relationship !== undefined) {
    if (!patch.relationship.trim()) return { error: "Relationship can't be blank." };
    row.relationship = patch.relationship.trim();
  }
  if (patch.email !== undefined) {
    const v = patch.email.trim();
    if (v && !EMAIL_RE.test(v)) return { error: "Enter a valid email address." };
    row.email = v || null;
  }
  if (patch.phone !== undefined) {
    const v = patch.phone.trim();
    const digits = v.replace(/\D/g, "");
    if (v && (digits.length < 7 || digits.length > 15)) return { error: "Enter a valid phone number." };
    row.phone = v || null;
  }
  if (patch.accentColor !== undefined) row.accent_color = patch.accentColor;
  if (Object.keys(row).length === 0) return {};

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("family_members").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidateProfileViews();
  return {};
}

// ── remove / head-of-household / forget ───────────────────────────────────

/** Hard-delete of the member row (member_details cascades). Distinct from
 * `forgetMemberInfo` — kept as its own function so the two can't be merged. */
export async function removeFamilyMember(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProfileViews();
  return {};
}

export async function setHeadOfHousehold(id: string, on: boolean): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (on) {
    const { data, error: readErr } = await supabase
      .from("family_members")
      .select("birthday")
      .eq("id", id)
      .single();
    if (readErr) return { error: readErr.message };
    if (!computeIsAdult(data?.birthday ?? null)) {
      return { error: "Only adults can be head of household." };
    }
  }
  const { error } = await supabase
    .from("family_members")
    .update({ is_head_of_household: on })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateProfileViews();
  return {};
}

/** Clears optional profile fields + every member_details row for one
 * member. Keeps id / name / accent_color / is_adult / birthday /
 * is_head_of_household, and never touches `entries`. */
export async function forgetMemberInfo(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error: clearErr } = await supabase
    .from("family_members")
    .update({ relationship: null, email: null, phone: null, school: null, grade: null })
    .eq("id", id);
  if (clearErr) return { error: clearErr.message };
  const { error: detErr } = await supabase.from("member_details").delete().eq("family_member_id", id);
  if (detErr) return { error: detErr.message };
  revalidateProfileViews();
  return {};
}

export async function forgetEverything(): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("family_members").select("id").returns<{ id: string }[]>();
  if (error) return { error: error.message };
  for (const m of data) {
    const res = await forgetMemberInfo(m.id);
    if (res.error) return res;
  }
  return {};
}

// ── active member (device convenience, not auth) ──────────────────────────

export async function setActiveMember(id: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_MEMBER_COOKIE, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidateProfileViews();
}
