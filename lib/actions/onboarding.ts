"use server";

import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { getHouseholdMembers } from "@/lib/data/onboarding";
import { saveFamilyMember, type FamilyMemberInput } from "@/lib/actions/familyMembers";
import { computeIsAdult } from "@/lib/family";
import type { AccentColor } from "@/lib/types";

/**
 * Onboarding's own actions — app-specific (household/family concepts),
 * deliberately not in lib/auth/. New as of the Identity/Sign-In/Onboarding
 * pass (2026-09-12), Phase 4. Scope note (see CLAUDE.md): the rest of the
 * app doesn't filter reads by household_id yet (accepted gap, deferred),
 * but these actions must still get *writes* right — a new household's own
 * data must never be attached to the wrong household_id.
 */

const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** No color picker in onboarding's add-member form (matches the design
 * canvas) — rotate through a fixed palette distinct from the account
 * holder's "blue" instead of asking. */
const ROSTER_COLOR_ROTATION: AccentColor[] = ["teal", "gold", "berry", "purple", "green", "pink"];

/** Stage B: creates the household and the account holder's own profile in
 * one step. Guarded against ever running twice for the same auth user —
 * that would silently create a second, orphaned household for someone who
 * already has one. */
export async function createProfileAndHousehold(input: {
  name: string;
  birthday: string; // YYYY-MM-DD
  phone: string;
  householdName: string;
}): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };

  const existing = await getFamilyMemberByAuthUserId(user.id);
  if (existing) return { error: "You already have a profile." };

  const name = input.name.trim();
  if (!name) return { error: "Name can't be blank." };
  if (!BIRTHDAY_RE.test(input.birthday)) return { error: "Enter a valid birthdate." };
  const phone = input.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return { error: "Enter a valid phone number." };
  }

  const supabase = getSupabaseClient();
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({ name: input.householdName.trim() || null })
    .select("id")
    .single();
  if (householdError || !household) {
    return { error: householdError?.message ?? "Could not create your household." };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    household_id: household.id,
    name,
    accent_color: "blue" satisfies AccentColor,
    is_adult: computeIsAdult(input.birthday),
    birthday: input.birthday,
    email: user.email ?? null,
    phone: phone || null,
    is_head_of_household: true,
    has_approval_authority: true,
    account_status: "activated",
    auth_user_id: user.id,
    sort_order: 0,
  });
  if (memberError) return { error: memberError.message };

  redirect(input.householdName.trim() ? "/onboarding/household" : "/onboarding/name-household");
}

/** NameHousehold — only reachable when Stage B's household name was left
 * blank. Takes the household id explicitly (passed from the server
 * component, itself derived from the session) rather than re-deriving it,
 * since this can also be reached via "skip" with an empty name. */
export async function setHouseholdName(householdId: string, name: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("households")
    .update({ name: name.trim() || null })
    .eq("id", householdId);
  if (error) return { error: error.message };
  redirect("/onboarding/household");
}

/** Stage C: add one profile-only member to the current session's
 * household. No device/login toggle — every addition here starts
 * profile_only, auth_user_id null (saveFamilyMember's defaults). */
export async function addHouseholdMember(input: {
  name: string;
  relationship: string;
  birthday: string;
}): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };

  if (!input.name.trim()) return { error: "Name can't be blank." };
  if (!BIRTHDAY_RE.test(input.birthday)) return { error: "Enter a valid birthdate." };

  const existingCount = (await getHouseholdMembers(self.householdId)).length;
  const accentColor = ROSTER_COLOR_ROTATION[existingCount % ROSTER_COLOR_ROTATION.length];

  const memberInput: FamilyMemberInput = {
    name: input.name,
    accentColor,
    relationship: input.relationship || null,
    birthday: input.birthday,
    email: null,
    phone: null,
    school: null,
    grade: null,
    householdId: self.householdId,
  };
  return saveFamilyMember(memberInput);
}

/** Stage D: confirm or reassign approval authority within the current
 * session's household — exactly one holder at a time (unlike
 * is_head_of_household, which already allows several). Lands on Today. */
export async function setApprovalAuthority(memberId: string): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };

  const supabase = getSupabaseClient();
  const { error: clearError } = await supabase
    .from("family_members")
    .update({ has_approval_authority: false })
    .eq("household_id", self.householdId);
  if (clearError) return { error: clearError.message };

  const { error: setError } = await supabase
    .from("family_members")
    .update({ has_approval_authority: true })
    .eq("id", memberId)
    .eq("household_id", self.householdId);
  if (setError) return { error: setError.message };

  redirect("/onboarding/invite");
}
