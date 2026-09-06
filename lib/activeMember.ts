import { cookies } from "next/headers";
import type { FamilyMember } from "@/lib/types";

/**
 * "Who is using the app right now" — a device-level convenience, NOT auth.
 * A plain cookie holds the active family member's id; there's no session,
 * no password, no server-side permission check anywhere. Used to decide
 * whose profile the header avatar opens and what My Profile shows.
 */
export const ACTIVE_MEMBER_COOKIE = "fcos_active_member";

/** Cookie value meaning "signed out" — distinct from "never set" (which
 * falls back to a default member). The lock screen shows while this is set. */
export const LOGGED_OUT = "__logged_out__";

export async function getActiveMemberId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_MEMBER_COOKIE)?.value ?? null;
}

/** True when the user explicitly logged out (device convenience, not auth). */
export async function isLoggedOut(): Promise<boolean> {
  return (await getActiveMemberId()) === LOGGED_OUT;
}

/** The stored member if it still exists, else the first head-of-household,
 * else the first adult, else the first member. Null for an empty roster OR
 * when explicitly logged out. */
export async function getActiveMember(members: FamilyMember[]): Promise<FamilyMember | null> {
  if (members.length === 0) return null;
  const storedId = await getActiveMemberId();
  if (storedId === LOGGED_OUT) return null;
  const stored = storedId ? members.find((m) => m.id === storedId) : undefined;
  return (
    stored ??
    members.find((m) => m.isHeadOfHousehold) ??
    members.find((m) => m.isAdult) ??
    members[0]
  );
}
