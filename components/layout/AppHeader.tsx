import Link from "next/link";
import { Menu, Mail, Bell } from "lucide-react";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

interface AppHeaderProps {
  pendingReviewCount: number;
  activeMember: FamilyMember | null;
}

export function AppHeader({ pendingReviewCount, activeMember }: AppHeaderProps) {
  return (
    <div className="flex justify-between items-center w-full px-4 py-3">
      <Link
        href="/settings"
        aria-label="Menu"
        className="text-ink hover:text-primary transition-colors flex items-center"
      >
        <Menu size={24} strokeWidth={2} />
      </Link>
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
        <Link
          href="/profile"
          aria-label="My Profile"
          className="w-10 h-10 rounded-full overflow-hidden border border-border shadow-sm flex items-center justify-center text-[13px] font-semibold hover:ring-2 hover:ring-primary/20 transition-all"
          style={
            activeMember
              ? { background: ACCENT_HEX[activeMember.accentColor], color: "#FFFFFF" }
              : { background: "#FFFFFF", color: "var(--color-muted-label)" }
          }
        >
          {activeMember ? initialsOf(activeMember.name) : "RA"}
        </Link>
      </div>
    </div>
  );
}
