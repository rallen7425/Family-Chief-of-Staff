import { MOCK_KEEP_IN_MIND } from "@/lib/mockData";
import type { KeepInMindItem } from "@/lib/types";

/** Phase 1: backed by in-memory mock data. Swaps to a Supabase query in Phase 3. */
export async function getActiveKeepInMindItems(): Promise<KeepInMindItem[]> {
  return MOCK_KEEP_IN_MIND.filter((item) => !item.dismissed);
}
