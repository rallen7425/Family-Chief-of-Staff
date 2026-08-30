import { cookies } from "next/headers";
import type { FamilyMember } from "@/lib/types";

/**
 * "Who is using the app right now" — a device-level convenience, NOT auth.
 * A plain cookie holds the active family member's id; there's no session,
 * no password, no server-side permission check anywhere. Used to decide
 * whose profile the header avatar opens and what My Profile shows.
 */
export const ACTIVE_MEMBER_COOKIE = "fcos_active_member";

export async function getActiveMemberId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_MEMBER_COOKIE)?.value ?? null;
}

/** The stored member if it still exists, else the first head-of-household,
 * else the first adult, else the first member. Null only for an empty roster. */
export async function getActiveMember(members: FamilyMember[]): Promise<FamilyMember | null> {
  if (members.length === 0) return null;
  const storedId = await getActiveMemberId();
  const stored = storedId ? members.find((m) => m.id === storedId) : undefined;
  return (
    stored ??
    members.find((m) => m.isHeadOfHousehold) ??
    members.find((m) => m.isAdult) ??
    members[0]
  );
}
