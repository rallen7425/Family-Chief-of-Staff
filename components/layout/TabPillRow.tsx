"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Today", href: "/" },
  { label: "Scheduled", href: "/schedule" },
  { label: "Message", href: "/message" },
  { label: "Todo", href: "/todo" },
];

export function TabPillRow() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "px-6 py-2 rounded-pill bg-primary text-white text-[14px] font-semibold shrink-0"
                : "px-6 py-2 rounded-pill bg-surface border border-border text-muted-text text-[14px] font-medium shrink-0 hover:bg-mist transition-colors"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
