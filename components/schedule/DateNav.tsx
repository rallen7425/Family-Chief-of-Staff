import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { ScheduleViewMode } from "@/lib/types";

interface DateNavProps {
  date: Date;
  viewMode: ScheduleViewMode;
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}

export function DateNav({ label, prevHref, nextHref, todayHref }: DateNavProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display font-semibold text-[20px] text-ink">{label}</h2>
      <div className="flex items-center gap-1">
        <Link
          href={todayHref}
          className="px-3 py-1.5 rounded-pill border border-border text-[13px] font-semibold text-muted-text hover:bg-mist transition-colors mr-1"
        >
          Today
        </Link>
        <Link
          href={prevHref}
          aria-label="Previous"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-mist transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <Link
          href={nextHref}
          aria-label="Next"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-mist transition-colors"
        >
          <ChevronRight size={20} />
        </Link>
      </div>
    </div>
  );
}

export function formatRangeLabel(start: Date, end: Date, viewMode: ScheduleViewMode) {
  if (viewMode === "day") return format(start, "EEEE, MMM d");
  if (viewMode === "month") return format(start, "MMMM yyyy");
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${format(start, "MMM d")} – ${format(end, "d")}`
    : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}
