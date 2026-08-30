import { ChevronRight, type LucideIcon } from "lucide-react";

/** The inner content of a Settings Hub row — wrap in a <Link> or <button>. */
export function SettingsRowContent({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  sub,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
}) {
  return (
    <>
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="block text-[12.5px] text-muted-label mt-0.5">{sub}</span>
      </span>
      <ChevronRight size={18} className="text-border shrink-0" />
    </>
  );
}

export const settingsRowClass =
  "w-full flex items-center gap-3.5 p-4 text-left border-b border-[#F1F3F6] last:border-b-0 hover:bg-mist/60 transition-colors";
