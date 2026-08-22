import { Menu, Mail, Bell } from "lucide-react";

export function AppHeader() {
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
        <button
          aria-label="Notifications"
          className="w-10 h-10 rounded-full flex items-center justify-center text-ink hover:text-primary transition-colors"
        >
          <Bell size={22} strokeWidth={2} />
        </button>
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
