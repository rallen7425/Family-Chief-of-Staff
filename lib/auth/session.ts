import { createAuthServerClient } from "@/lib/auth/serverClient";

/**
 * The one thing later phases need from this layer: "is anyone signed in
 * right now, and who." Deliberately returns Supabase Auth's own `User` type
 * unmodified — this file must never import or reference `family_members`,
 * `household_id`, or anything app-specific (see lib/auth/serverClient.ts's
 * scope-boundary comment). Linking an authenticated user to this app's
 * household/profile data is app-specific logic that belongs in
 * lib/data/familyMembers.ts (or similar), not here.
 */
export async function getAuthUser() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
