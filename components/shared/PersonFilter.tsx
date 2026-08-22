import Link from "next/link";
import type { FamilyMember } from "@/lib/types";
import { ACCENT_BG } from "@/lib/colors";

interface PersonFilterProps {
  familyMembers: FamilyMember[];
  selectedPersonId: string; // "all" | member id
  buildHref: (personId: string) => string;
}

export function PersonFilter({ familyMembers, selectedPersonId, buildHref }: PersonFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
      <Link href={buildHref("all")} className={pillClass(selectedPersonId === "all")}>
        All
      </Link>
      {familyMembers.map((member) => (
        <Link
          key={member.id}
          href={buildHref(member.id)}
          className={`${pillClass(selectedPersonId === member.id)} inline-flex items-center gap-2`}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ACCENT_BG[member.accentColor]}`} />
          {member.name}
        </Link>
      ))}
    </div>
  );
}

function pillClass(active: boolean) {
  return active
    ? "px-4 py-1.5 rounded-pill bg-primary text-white text-[13px] font-semibold shrink-0"
    : "px-4 py-1.5 rounded-pill bg-surface border border-border text-muted-text text-[13px] font-medium shrink-0 hover:bg-mist transition-colors";
}
