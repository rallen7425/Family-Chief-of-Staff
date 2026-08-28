import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { ArrivalBufferRule } from "@/lib/arrival";

interface ArrivalBufferRuleRow {
  id: string;
  category: string | null;
  applies_to_kids_only: boolean;
  buffer_minutes: number;
  created_at: string;
}

function mapRule(row: ArrivalBufferRuleRow): ArrivalBufferRule {
  return {
    id: row.id,
    category: row.category,
    appliesToKidsOnly: row.applies_to_kids_only,
    bufferMinutes: row.buffer_minutes,
  };
}

/** Ordered general-first (category IS NULL), then by creation order. */
export const getArrivalBufferRules = cache(async (): Promise<ArrivalBufferRule[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("arrival_buffer_rules")
    .select("*")
    .order("category", { ascending: true, nullsFirst: true })
    .order("created_at")
    .returns<ArrivalBufferRuleRow[]>();
  if (error) throw error;
  return data.map(mapRule);
});
