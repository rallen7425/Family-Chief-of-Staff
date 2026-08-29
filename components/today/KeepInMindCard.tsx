import Link from "next/link";
import { KeepInMindSystemRow } from "@/components/today/KeepInMindSystemRow";
import { SEVERITY_DOT } from "@/components/notifications/severity";
import type { RankedNotifications } from "@/lib/notifications";

/**
 * "Notifications" — a deliberately condensed strip on the Today screen. Shows
 * the pinned Review nudge plus the top `IMPORTANT_LIMIT` ranked notifications
 * (already sliced by `getRankedNotifications`), each one compact row with a
 * severity dot. The badge shows the true total; everything else lives behind
 * "View all →" (/notifications). Kept short on purpose so the Schedule card
 * and at least its first item stay visible on a phone.
 */
export function KeepInMindCard({ notifications }: { notifications: RankedNotifications }) {
  const { reviewNudge, important, more, total } = notifications;
  const rows = [...(reviewNudge ? [reviewNudge] : []), ...important];
  const hiddenCount = more.length;

  return (
    <section className="bg-surface rounded-card pt-3 px-4 pb-2.5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">Notifications</h2>
        {total > 0 && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full min-w-[16px] text-center px-1.5 py-px">
            {total}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-muted-label">Nothing to flag right now.</p>
      ) : (
        <>
          <div className="flex flex-col">
            {rows.map((n) => {
              if (n.kind === "system") {
                return (
                  <KeepInMindSystemRow key={n.id} body={n.title} dotClass={SEVERITY_DOT[n.severity]} />
                );
              }
              return (
                <Link
                  key={n.id}
                  href={n.href ?? "/notifications"}
                  className="w-full flex items-center gap-[9px] py-[5px]"
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{n.title}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex justify-end mt-0.5">
            <Link
              href="/notifications"
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              {hiddenCount > 0 ? `View all (${hiddenCount} more) →` : "View all →"}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
