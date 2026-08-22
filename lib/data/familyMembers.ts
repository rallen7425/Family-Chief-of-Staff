import { FAMILY_MEMBERS } from "@/lib/mockData";
import type { FamilyMember } from "@/lib/types";

/** Phase 1: backed by in-memory mock data. Swaps to a Supabase query in Phase 3. */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  return FAMILY_MEMBERS;
}
