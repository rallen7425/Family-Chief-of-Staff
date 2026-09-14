import { cache } from "react";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import type { FamilyMember } from "@/lib/types";

/**
 * The one "who is this" resolution for the whole app, replacing the old
 * fcos_active_member device cookie (lib/activeMember.ts, retired) now that
 * every screen requires a real Supabase Auth session. Null means either not
 * signed in, or signed in but not yet onboarded (no linked family_members
 * row) — both cases the caller should redirect to /signin or
 * /onboarding/profile, same as lib/actions/auth.ts's
 * resolvePostSignInDestination() already does.
 *
 * Kept out of lib/auth/session.ts on purpose — that file must never
 * reference family_members (see its own scope-boundary comment).
 */
export const getCurrentMember = cache(async (): Promise<FamilyMember | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  return getFamilyMemberByAuthUserId(user.id);
});
