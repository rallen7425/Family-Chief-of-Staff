import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";

/** Resolves the signed-in member's household — every mutating Server Action
 * scopes its write to it, same pattern originally proven in
 * lib/actions/invites.ts and lib/actions/onboarding.ts. */
export async function requireHousehold(): Promise<{ householdId: string } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "You need to be signed in." };
  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) return { error: "Complete your own profile first." };
  return { householdId: self.householdId };
}
