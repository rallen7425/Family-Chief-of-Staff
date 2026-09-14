"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAuthServerClient } from "@/lib/auth/serverClient";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";

/**
 * App-specific glue between the shared identity layer (lib/auth/) and this
 * app's household concept — deliberately NOT part of lib/auth/ itself (see
 * that folder's scope-boundary comments). A different Rocky Coast Labs app
 * consuming lib/auth/ later would write its own version of this file, not
 * reuse this one.
 */

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Where a just-authenticated session should land: Today if this person
 * already has a household profile, onboarding if not (a brand-new signup,
 * always). /onboarding/profile is Phase 4 work — not built yet as of this
 * phase, so a not-yet-onboarded sign-in 404s there for now, which is the
 * expected mid-build state, not a bug. */
export async function resolvePostSignInDestination(): Promise<string> {
  const user = await getAuthUser();
  if (!user) return "/signin";
  const member = await getFamilyMemberByAuthUserId(user.id);
  return member ? "/" : "/onboarding/profile";
}

export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(await resolvePostSignInDestination());
}

export async function signInWithGoogleAction(): Promise<{ error?: string }> {
  const supabase = await createAuthServerClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  redirect(data.url);
}

/** Credentials-only, per the plan's "asked for the same info twice" fix —
 * no name/profile field here. Always proceeds to onboarding: a brand-new
 * signup can never already have a linked family_members row. */
export async function signUpWithPasswordAction(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  redirect("/onboarding/profile");
}

/** Ends the real Supabase session — replaces the old fake logOut() (a
 * device-cookie write in lib/actions/familyMembers.ts, retired). "Switch
 * account" is just this followed by signing in again as someone else via
 * the normal /signin form. */
export async function signOutAction(): Promise<never> {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/signin");
}
