"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { requireHousehold } from "@/lib/actions/requireHousehold";

/**
 * Records a household-wide "dismissed" state for one derived notification,
 * keyed by its stable id ("soon:<uuid>", "todo:<uuid>", "kim:<uuid>", …).
 * Advisories and the review nudge pass `dismissible: false` and never call
 * this. Idempotent — upsert on the primary key.
 */
export async function dismissNotification(id: string): Promise<void> {
  if (!id) return;
  const household = await requireHousehold();
  if ("error" in household) throw new Error(household.error);
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notification_dismissals")
    .upsert(
      { notification_id: id, household_id: household.householdId },
      { onConflict: "notification_id", ignoreDuplicates: true }
    );
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/notifications");
}
