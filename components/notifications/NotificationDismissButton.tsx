"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { dismissNotification } from "@/lib/actions/notifications";

/** Dismisses one notification (writes to `notification_dismissals`). Only
 * rendered for `dismissible` rows — advisories and the review nudge don't
 * get one. */
export function NotificationDismissButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Dismiss"
      disabled={pending}
      onClick={() => start(() => dismissNotification(id))}
      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-label hover:bg-mist hover:text-accent-berry transition-colors disabled:opacity-40"
    >
      <X size={15} />
    </button>
  );
}
