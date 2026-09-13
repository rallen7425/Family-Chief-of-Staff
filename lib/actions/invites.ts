"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth/session";
import { createAuthServerClient } from "@/lib/auth/serverClient";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { computeIsAdult } from "@/lib/family";

/**
 * Stage E (invite a member to create their own login) + acceptance side —
 * new as of the Identity/Sign-In/Onboarding pass (2026-09-12), Phase 5.
 *
 * Outbound email uses Supabase's own supabase.auth.admin.inviteUserByEmail
 * (decision recorded in CLAUDE.md) — no third-party provider. Confirmed
 * empirically (via generateLink, no real email sent) that this project's
 * Supabase Auth uses the implicit hash-fragment flow, not PKCE: the
 * invite link redirects to `{redirectTo}#access_token=...&type=invite`,
 * which only a Client Component can read (see app/join/accept/page.tsx +
 * components/join/JoinAcceptClient.tsx) — this app's existing
 * /auth/callback Route Handler (built for OAuth's `?code=` flow) cannot
 * handle this.
 */

const INVITE_TTL_DAYS = 14;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateJoinCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += JOIN_CODE_ALPHABET[bytes[i] % JOIN_CODE_ALPHABET.length];
  return code;
}

function expiresAt(): string {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function getOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// ── Stage E: invite an existing profile-only member ─────────────────────────

export type ViewScope = "own" | "siblings" | "household";
export type SubmissionTier = "requires_approval" | "independent";

export async function inviteExistingMemberByCode(input: {
  memberId: string;
  viewScope: ViewScope;
  submissionTier: SubmissionTier;
}): Promise<{ error?: string; joinCode?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };

  const supabase = getSupabaseClient();
  const { data: target } = await supabase
    .from("family_members")
    .select("id, household_id, account_status")
    .eq("id", input.memberId)
    .maybeSingle();
  if (!target || target.household_id !== self.householdId) {
    return { error: "That person isn't in your household." };
  }
  if (target.account_status !== "profile_only") {
    return { error: "That person already has their own login." };
  }

  const joinCode = generateJoinCode();
  const { error } = await supabase.from("household_invites").insert({
    household_id: self.householdId,
    family_member_id: input.memberId,
    invite_type: "activate_member",
    method: "join_code",
    join_code: joinCode,
    view_scope: input.viewScope,
    submission_tier: input.submissionTier,
    status: "pending",
    expires_at: expiresAt(),
  });
  if (error) return { error: error.message };

  return { joinCode };
}

export async function inviteExistingMemberByEmail(input: {
  memberId: string;
  email: string;
  viewScope: ViewScope;
  submissionTier: SubmissionTier;
}): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };

  const email = input.email.trim();
  if (!email) return { error: "Enter an email address." };

  const supabase = getSupabaseClient();
  const { data: target } = await supabase
    .from("family_members")
    .select("id, household_id, account_status")
    .eq("id", input.memberId)
    .maybeSingle();
  if (!target || target.household_id !== self.householdId) {
    return { error: "That person isn't in your household." };
  }
  if (target.account_status !== "profile_only") {
    return { error: "That person already has their own login." };
  }

  const { error: insertError } = await supabase.from("household_invites").insert({
    household_id: self.householdId,
    family_member_id: input.memberId,
    invite_type: "activate_member",
    method: "email",
    email,
    view_scope: input.viewScope,
    submission_tier: input.submissionTier,
    status: "pending",
    expires_at: expiresAt(),
  });
  if (insertError) return { error: insertError.message };

  const origin = await getOrigin();
  const { error: sendError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/join/accept`,
  });
  if (sendError) return { error: sendError.message };

  return {};
}

// ── Stage E: invite a brand-new co-parent (/onboarding/invite) ─────────────

export async function inviteCoParent(email: string): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };

  const trimmed = email.trim();
  if (!trimmed) return { error: "Enter an email address." };

  const supabase = getSupabaseClient();
  const { error: insertError } = await supabase.from("household_invites").insert({
    household_id: self.householdId,
    family_member_id: null,
    invite_type: "new_adult",
    method: "email",
    email: trimmed,
    status: "pending",
    expires_at: expiresAt(),
  });
  if (insertError) return { error: insertError.message };

  const origin = await getOrigin();
  const { error: sendError } = await supabase.auth.admin.inviteUserByEmail(trimmed, {
    redirectTo: `${origin}/join/accept`,
  });
  if (sendError) return { error: sendError.message };

  return {};
}

/** OnboardingInvite's own "Finish setup" — a separate step from sending the
 * invite (per the design canvas: sending an invite doesn't itself end
 * onboarding, matching "you could invite more than one person" in spirit
 * even though only one invite field is shown). */
export async function finishOnboarding(): Promise<never> {
  redirect("/");
}

// ── Acceptance: join code (no session yet — creates one) ───────────────────

export async function redeemJoinCode(input: {
  code: string;
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  const code = input.code.trim().toUpperCase();
  const email = input.email.trim();
  if (!code) return { error: "Enter your join code." };
  if (!email) return { error: "Enter an email address." };
  if (input.password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = getSupabaseClient();
  const { data: invite } = await supabase
    .from("household_invites")
    .select("*")
    .eq("join_code", code)
    .eq("status", "pending")
    .maybeSingle();
  if (!invite) return { error: "That code isn't valid." };
  if (new Date(invite.expires_at) < new Date()) return { error: "That code has expired." };
  if (!invite.family_member_id) return { error: "That code isn't set up correctly." };

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create your login." };
  }

  const { error: linkError } = await supabase
    .from("family_members")
    .update({
      account_status: "activated",
      auth_user_id: created.user.id,
      view_scope: invite.view_scope,
      submission_tier: invite.submission_tier,
    })
    .eq("id", invite.family_member_id);
  if (linkError) return { error: linkError.message };

  await supabase
    .from("household_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Sign them in for real — admin.createUser doesn't establish a session.
  const authClient = await createAuthServerClient();
  const { error: signInError } = await authClient.auth.signInWithPassword({ email, password: input.password });
  if (signInError) return { error: signInError.message };

  redirect("/");
}

// ── Acceptance: email link (session already established client-side) ──────

/** Called from app/join/accept's client page once the browser has
 * auto-detected the session from the invite link's hash fragment (see
 * this file's top comment). Resolves which pending invite this now-
 * authenticated email corresponds to — no invite id needs to travel
 * through the URL. */
export async function completeEmailInvite(): Promise<{ error?: string; redirectTo?: string }> {
  const user = await getAuthUser();
  if (!user?.email) return { error: "Not signed in." };

  const supabase = getSupabaseClient();
  const { data: invite } = await supabase
    .from("household_invites")
    .select("*")
    .eq("email", user.email)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite) {
    // Already accepted in a prior visit, or none exists — if this auth
    // user already has a profile, just send them home instead of erroring.
    const existing = await getFamilyMemberByAuthUserId(user.id);
    return existing ? { redirectTo: "/" } : { error: "No pending invite found for this email." };
  }
  if (new Date(invite.expires_at) < new Date()) return { error: "That invite has expired." };

  if (invite.invite_type === "activate_member") {
    if (!invite.family_member_id) return { error: "That invite isn't set up correctly." };
    const { error: linkError } = await supabase
      .from("family_members")
      .update({
        account_status: "activated",
        auth_user_id: user.id,
        view_scope: invite.view_scope,
        submission_tier: invite.submission_tier,
      })
      .eq("id", invite.family_member_id);
    if (linkError) return { error: linkError.message };

    await supabase
      .from("household_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { redirectTo: "/" };
  }

  // new_adult: no name/birthdate on file yet — mark accepted (the auth
  // identity is real and linked to this household via the invite record),
  // then send them to finish their own profile before landing on Today.
  await supabase
    .from("household_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { redirectTo: "/onboarding/join-profile" };
}

/** The /onboarding/join-profile step for an accepted new_adult invite —
 * name + birthdate only (the household already exists; no household-name
 * field, no connect card, matching /onboarding/profile's own deferrals). */
export async function completeNewAdultProfile(input: {
  name: string;
  birthday: string;
}): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user?.email) return { error: "Not signed in." };

  const existing = await getFamilyMemberByAuthUserId(user.id);
  if (existing) return { error: "You already have a profile." };

  const name = input.name.trim();
  if (!name) return { error: "Name can't be blank." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthday)) return { error: "Enter a valid birthdate." };

  const supabase = getSupabaseClient();
  const { data: invite } = await supabase
    .from("household_invites")
    .select("household_id")
    .eq("email", user.email)
    .eq("invite_type", "new_adult")
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!invite) return { error: "No accepted invite found for this email." };

  const { error } = await supabase.from("family_members").insert({
    household_id: invite.household_id,
    name,
    accent_color: "green",
    is_adult: computeIsAdult(input.birthday),
    birthday: input.birthday,
    email: user.email,
    is_head_of_household: true,
    has_approval_authority: false,
    account_status: "activated",
    auth_user_id: user.id,
  });
  if (error) return { error: error.message };

  redirect("/");
}
