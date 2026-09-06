"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setActiveMember } from "@/lib/actions/familyMembers";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

/**
 * The "who's using the app" chooser — device convenience, not auth. Used by
 * the lock screen and by Settings → Switch Account. Picking someone sets
 * the `fcos_active_member` cookie and refreshes.
 */
export function MemberPicker({
  members,
  currentId,
  onPicked,
}: {
  members: FamilyMember[];
  currentId?: string | null;
  /** Extra client action after the cookie is set (e.g. close a sheet). */
  onPicked?: () => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  function pick(id: string) {
    start(async () => {
      await setActiveMember(id);
      onPicked?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => {
        const active = m.id === currentId;
        return (
          <button
            key={m.id}
            type="button"
            disabled={isPending}
            onClick={() => pick(m.id)}
            className={`flex items-center gap-3 rounded-input border p-3 text-left transition-colors disabled:opacity-60 ${
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-surface hover:bg-mist"
            }`}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
              style={{ background: ACCENT_HEX[m.accentColor] }}
            >
              {initialsOf(m.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{m.name}</span>
              <span className="block text-[12.5px] text-muted-label">
                {m.relationship || (m.isAdult ? "Adult" : "Child")}
                {m.isHeadOfHousehold ? " · Head of household" : ""}
              </span>
            </span>
            {active && <Check size={18} className="shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
