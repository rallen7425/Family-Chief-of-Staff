import Link from "next/link";
import { SEVERITY_DOT } from "@/components/notifications/severity";
import { NotificationDismissButton } from "@/components/notifications/NotificationDismissButton";
import type { Notification } from "@/lib/notifications";

/** One row in the /notifications feed: severity dot + title + optional
 * detail, the whole thing a link when the notification has a destination,
 * plus a dismiss control for `dismissible` rows. */
export function NotificationRow({ n }: { n: Notification }) {
  const body = (
    <>
      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink leading-snug">{n.title}</p>
        {n.detail && <p className="text-[12px] text-muted-label mt-0.5 leading-snug">{n.detail}</p>}
      </div>
    </>
  );

  return (
    <div className="flex items-start gap-2.5">
      {n.href ? (
        <Link href={n.href} className="flex flex-1 items-start gap-2.5 min-w-0">
          {body}
        </Link>
      ) : (
        <div className="flex flex-1 items-start gap-2.5 min-w-0">{body}</div>
      )}
      {n.dismissible && <NotificationDismissButton id={n.id} />}
    </div>
  );
}
