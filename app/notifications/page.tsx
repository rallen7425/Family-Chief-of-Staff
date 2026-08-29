import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRankedNotifications } from "@/lib/notifications";
import { NotificationRow } from "@/components/notifications/NotificationRow";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { reviewNudge, important, more } = await getRankedNotifications();
  const isEmpty = !reviewNudge && important.length === 0 && more.length === 0;

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Notifications</h1>

      {isEmpty && (
        <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
          <p className="text-[14px] text-muted-label">You&rsquo;re all caught up.</p>
        </section>
      )}

      {reviewNudge && (
        <section className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
          <Link href={reviewNudge.href ?? "/review"} className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink leading-snug">{reviewNudge.title}</p>
                {reviewNudge.detail && (
                  <p className="text-[13px] text-muted-label mt-0.5 leading-snug">{reviewNudge.detail}</p>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-label shrink-0" />
          </Link>
        </section>
      )}

      {important.length > 0 && (
        <section className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
          <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">Important</h2>
          <div className="flex flex-col gap-3.5">
            {important.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
          <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">More</h2>
          <div className="flex flex-col gap-3.5">
            {more.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
