"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { completeChoreAction } from "@/lib/actions/chores";
import { celebrationMessage } from "@/lib/chores";
import { CelebrationModal } from "@/components/chores/CelebrationModal";
import type { Chore, FamilyMember, MemberPoints } from "@/lib/types";

interface TodaysChoresProps {
  member: FamilyMember;
  /** All of today's occurrences, done or not — see occurrencesToday. */
  chores: Chore[];
  doneChoreIds: string[];
  points: MemberPoints;
}

export function TodaysChores({ member, chores, doneChoreIds, points }: TodaysChoresProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<string | null>(null);
  const doneSet = new Set(doneChoreIds);

  function complete(choreId: string, status: "complete" | "partial") {
    startTransition(async () => {
      const result = await completeChoreAction(choreId, member.id, status);
      if ("milestoneHit" in result && result.milestoneHit) {
        setCelebration(celebrationMessage(result));
      }
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <p className="text-muted-text text-[13px] font-medium tracking-wide mb-1 uppercase">Today&rsquo;s Chores</p>
        <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">
          Hey {member.name.split(" ")[0]}!
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-2.5">
          <Flame size={20} className="text-accent-gold fill-accent-gold shrink-0" />
          <div>
            <p className="text-[18px] font-display font-semibold text-ink">{points.currentStreak}</p>
            <p className="text-[11.5px] text-muted-label">day streak</p>
          </div>
        </div>
        <div className="bg-surface rounded-card p-4 shadow-sm shadow-black/5">
          <p className="text-[18px] font-display font-semibold text-ink">{points.balance}</p>
          <p className="text-[11.5px] text-muted-label">points</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {chores.length === 0 && (
          <div className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 text-center">
            <p className="text-[14px] text-muted-label">Nothing due today.</p>
          </div>
        )}
        {chores.map((chore) => {
          const done = doneSet.has(chore.id);
          return (
            <div
              key={chore.id}
              className={`bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5 ${done ? "opacity-60" : ""}`}
            >
              <button
                type="button"
                onClick={() => !done && complete(chore.id, "complete")}
                disabled={done || isPending}
                aria-label={done ? `${chore.title} completed` : `Mark ${chore.title} complete`}
                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  done ? "bg-primary border-primary" : "border-border hover:border-primary"
                }`}
              >
                {done && <Check size={15} className="text-white" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium ${done ? "text-muted-label line-through" : "text-ink"}`}>
                  {chore.title}
                </p>
                <p className="text-[12px] text-muted-label">{chore.points} pts</p>
              </div>
              {!done && (
                <button
                  type="button"
                  onClick={() => complete(chore.id, "partial")}
                  disabled={isPending}
                  className="text-[12px] font-semibold text-primary shrink-0 hover:underline disabled:opacity-50"
                >
                  Partial
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Link
          href="/chores/progress"
          className="flex-1 text-center py-2.5 rounded-pill bg-surface border border-border text-ink text-[13px] font-semibold hover:bg-mist transition-colors"
        >
          My Progress
        </Link>
        <Link
          href="/chores/leaderboard"
          className="flex-1 text-center py-2.5 rounded-pill bg-surface border border-border text-ink text-[13px] font-semibold hover:bg-mist transition-colors"
        >
          Leaderboard
        </Link>
        <Link
          href="/chores/goals"
          className="flex-1 text-center py-2.5 rounded-pill bg-surface border border-border text-ink text-[13px] font-semibold hover:bg-mist transition-colors"
        >
          Goals
        </Link>
      </div>

      <CelebrationModal message={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}
