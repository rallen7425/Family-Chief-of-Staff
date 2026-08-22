import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { getPendingReviewEvents } from "@/lib/data/events";
import { getPendingReviewTodos } from "@/lib/data/todos";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [events, todos] = await Promise.all([getPendingReviewEvents(), getPendingReviewTodos()]);
  const pendingCount = events.length + todos.length;

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Notifications</h1>
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
        {pendingCount === 0 ? (
          <p className="text-[14px] text-muted-label">You&rsquo;re all caught up.</p>
        ) : (
          <Link href="/review" className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div>
                <p className="text-[15px] font-medium text-ink">
                  {pendingCount} new {pendingCount === 1 ? "entry needs" : "entries need"} approval
                </p>
                <p className="text-[13px] text-muted-label mt-0.5">Tap to review and approve</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-label shrink-0" />
          </Link>
        )}
      </section>
    </>
  );
}
