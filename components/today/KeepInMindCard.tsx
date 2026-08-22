import { Bell, Cloud, Bookmark, Package, AlertCircle } from "lucide-react";
import type { KeepInMindItem, CalendarEvent } from "@/lib/types";

const ICONS = {
  weather: Cloud,
  reminder: Bookmark,
  package: Package,
  review: AlertCircle,
} as const;

interface KeepInMindCardProps {
  items: KeepInMindItem[];
  pendingReviewEvents: CalendarEvent[];
}

export function KeepInMindCard({ items, pendingReviewEvents }: KeepInMindCardProps) {
  const hasContent = items.length > 0 || pendingReviewEvents.length > 0;

  return (
    <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={18} className="text-muted-text" />
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">
          Keep in mind
        </h2>
      </div>
      {!hasContent && <p className="text-[14px] text-muted-label">Nothing to flag right now.</p>}
      <ul className="flex flex-col gap-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <Icon size={20} className="text-muted-text mt-[1px] shrink-0" />
              <span className="text-[15px] font-medium leading-relaxed text-ink">{item.body}</span>
            </li>
          );
        })}
        {pendingReviewEvents.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <AlertCircle size={20} className="text-primary mt-[1px] shrink-0" />
            <span className="text-[15px] font-medium leading-relaxed text-ink">
              &ldquo;{event.title}&rdquo; was added from an email —{" "}
              <span className="text-primary font-semibold">needs your review</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
