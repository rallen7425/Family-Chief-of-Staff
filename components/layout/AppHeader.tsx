import Link from "next/link";
import { Menu, Mail, Bell } from "lucide-react";

interface AppHeaderProps {
  pendingReviewCount: number;
}

export function AppHeader({ pendingReviewCount }: AppHeaderProps) {
  return (
    <div className="flex justify-between items-center w-full px-4 py-3">
      <button
        aria-label="Menu"
        className="text-ink hover:text-primary transition-colors flex items-center"
      >
        <Menu size={24} strokeWidth={2} />
      </button>
      <div className="flex items-center gap-2">
        <button
          aria-label="Mail"
          className="w-10 h-10 rounded-full flex items-center justify-center text-ink hover:text-primary transition-colors"
        >
          <Mail size={22} strokeWidth={2} />
        </button>
        <Link
          href="/notifications"
          aria-label={pendingReviewCount > 0 ? `Notifications (${pendingReviewCount} new)` : "Notifications"}
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink hover:text-primary transition-colors"
        >
          <Bell size={22} strokeWidth={2} />
          {pendingReviewCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-accent-berry border-2 border-mist" />
          )}
        </Link>
        <button
          aria-label="Profile"
          className="w-10 h-10 rounded-full overflow-hidden border border-border shadow-sm bg-surface flex items-center justify-center text-muted-label text-[13px] font-semibold hover:ring-2 hover:ring-primary/20 transition-all"
        >
          RA
        </button>
      </div>
    </div>
  );
}
