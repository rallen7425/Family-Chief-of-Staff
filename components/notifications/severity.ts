import type { NotificationSeverity } from "@/lib/notifications";

/** Dot color per severity — shared by the Today tile and /notifications.
 * Berry is otherwise "removed / destructive"; here it doubles as "critical". */
export const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  critical: "bg-accent-berry",
  high: "bg-primary",
  normal: "bg-muted-text",
};
