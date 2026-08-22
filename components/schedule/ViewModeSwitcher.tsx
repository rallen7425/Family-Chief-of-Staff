import Link from "next/link";
import type { ScheduleViewMode } from "@/lib/types";

const MODES: { value: ScheduleViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "3day", label: "3-Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

interface ViewModeSwitcherProps {
  active: ScheduleViewMode;
  buildHref: (view: ScheduleViewMode) => string;
}

export function ViewModeSwitcher({ active, buildHref }: ViewModeSwitcherProps) {
  return (
    <div className="flex bg-mist border border-border rounded-input p-1 gap-1">
      {MODES.map((mode) => (
        <Link
          key={mode.value}
          href={buildHref(mode.value)}
          className={
            mode.value === active
              ? "flex-1 text-center py-1.5 rounded-[8px] bg-surface text-ink text-[13px] font-semibold shadow-sm"
              : "flex-1 text-center py-1.5 rounded-[8px] text-muted-text text-[13px] font-medium hover:text-ink transition-colors"
          }
        >
          {mode.label}
        </Link>
      ))}
    </div>
  );
}
