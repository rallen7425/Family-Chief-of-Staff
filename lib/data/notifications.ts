import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { NotificationDismissalRow } from "@/lib/data/dbTypes";

/** The set of notification ids the household has dismissed. Wrapped in
 * cache() — the Today page and /notifications both need it per request. */
export const getNotificationDismissals = cache(async (): Promise<Set<string>> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notification_dismissals")
    .select("notification_id")
    .returns<Pick<NotificationDismissalRow, "notification_id">[]>();
  if (error) throw error;
  return new Set(data.map((row) => row.notification_id));
});
