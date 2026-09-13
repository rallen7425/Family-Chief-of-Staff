"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase Auth client — new as of the Identity/Sign-In/
 * Onboarding pass (2026-09-12), the first time this app has used the anon
 * key or a browser Supabase client (see lib/supabase.ts's own note on why
 * that was true until now).
 *
 * Scope boundary: this client (and everything under lib/auth/) is ONLY for
 * authentication — sign-in, sign-up, OAuth, session/session-state. It must
 * never import anything about households, family members, or onboarding.
 * Kept cleanly isolated so it can be promoted to a real shared
 * `rocky-coast-auth` package later without a rewrite, once a second real
 * Next.js consumer actually needs it (see CLAUDE.md's 2026-09-12 note on
 * why that isn't built as a shared package yet).
 *
 * All family_chief_of_staff data access stays exclusively on the
 * service-role client (lib/supabase.ts) from server code — this client is
 * never used to query app data.
 */
export function createAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, anonKey);
}
