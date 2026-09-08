"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import { completeChoreAction } from "@/lib/actions/chores";
import { celebrationMessage } from "@/lib/chores";
import { ACCENT_HEX } from "@/lib/colors";
import { CelebrationModal } from "@/components/chores/CelebrationModal";
import type { FamilyMember, RightNowChore } from "@/lib/types";

interface RightNowCardProps {
  chore: RightNowChore | null;
  member: FamilyMember;
}

function timingLabel(chore: RightNowChore): string {
  if (chore.deadlineTime) {
    const [h, m] = chore.deadlineTime.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `Due by ${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }
  switch (chore.timeWindow) {
    case "before_school":
      return "Before school";
    case "after_school":
      return "After school";
    case "evening":
      return "This evening";
    case "anytime":
      return "Anytime today";
  }
}

/** The Today page's single, tiny "do this now" nudge — at most one card,
 * never a list. Renders nothing (not an empty state) when nothing is
 * eligible; see lib/rightNow.ts for the surfacing logic. */
export function RightNowCard({ chore, member }: RightNowCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<string | null>(null);

  if (!chore) return null;
  const eligible = chore;
  const color = ACCENT_HEX[member.accentColor];

  function handleComplete() {
    startTransition(async () => {
      const result = await completeChoreAction(eligible.choreId, member.id, "complete");
      if ("milestoneHit" in result && result.milestoneHit) {
        setCelebration(celebrationMessage(result));
      }
      router.refresh();
    });
  }

  return (
    <>
    <section
      className="rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5"
      style={{ background: `linear-gradient(135deg, ${color}1A 0%, #FFFFFF 55%)` }}
    >
      <div
        className="relative w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0"
        style={{ background: color }}
      >
        <Sparkles size={20} className="text-white" strokeWidth={2.2} />
        <div
          className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 border-surface flex items-center justify-center text-white text-[9px] font-bold font-display"
          style={{ background: color }}
        >
          {member.name.trim().charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color }}>
          Quick chore · right now
        </p>
        <p className="text-[16px] font-semibold text-ink truncate">{eligible.title}</p>
        <p className="text-[12px] text-muted-label">
          {eligible.points} pts · {timingLabel(eligible)}
        </p>
      </div>
      <button
        type="button"
        aria-label="Mark complete"
        disabled={isPending}
        onClick={handleComplete}
        className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
        style={{ background: color }}
      >
        <Check size={16} className="text-white" strokeWidth={3} />
      </button>
    </section>
    <CelebrationModal message={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}
