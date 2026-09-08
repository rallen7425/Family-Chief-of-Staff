"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { claimGoalAction } from "@/lib/actions/goals";
import { isGoalAvailableTo } from "@/lib/data/goals";
import type { FamilyMember, Goal, GoalClaim } from "@/lib/types";

interface GoalsChildProps {
  member: FamilyMember;
  goals: Goal[];
  claims: GoalClaim[];
  balance: number;
}

const STATUS_LABEL: Record<GoalClaim["status"], string> = {
  pending: "Pending",
  achieved: "Achieved",
  denied: "Denied",
};

const STATUS_CLASS: Record<GoalClaim["status"], string> = {
  pending: "text-accent-gold",
  achieved: "text-primary",
  denied: "text-muted-label",
};

export function GoalsChild({ member, goals, claims, balance }: GoalsChildProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pendingGoalIds = new Set(claims.filter((c) => c.status === "pending").map((c) => c.goalId));
  const available = goals.filter(
    (g) => g.active && isGoalAvailableTo(g, member.id) && !pendingGoalIds.has(g.id)
  );
  const goalById = new Map(goals.map((g) => [g.id, g]));

  function claim(goalId: string) {
    startTransition(async () => {
      await claimGoalAction(goalId, member.id);
      router.refresh();
    });
  }

  return (
    <>
      <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Goals</h1>
      <p className="text-[13px] text-muted-label -mt-2">{balance} points to spend</p>

      <section>
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">In progress</h2>
        <div className="flex flex-col gap-2.5">
          {available.length === 0 && <p className="text-[14px] text-muted-label">No goals available right now.</p>}
          {available.map((goal) => {
            const pct = Math.min(100, Math.round((balance / goal.pointsNeeded) * 100));
            const claimable = balance >= goal.pointsNeeded;
            return (
              <div key={goal.id} className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-mist flex items-center justify-center shrink-0">
                  <Gift size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{goal.name}</p>
                  <p className="text-[12px] text-muted-label mb-1.5">
                    {balance} / {goal.pointsNeeded} pts
                  </p>
                  <div className="h-1.5 w-full rounded-pill bg-mist overflow-hidden">
                    <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => claim(goal.id)}
                  disabled={!claimable || isPending}
                  className="px-3.5 py-2 rounded-pill bg-primary text-white text-[13px] font-semibold shrink-0 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:hover:bg-primary"
                >
                  Claim
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">My goals</h2>
        <div className="flex flex-col gap-2">
          {claims.length === 0 && <p className="text-[14px] text-muted-label">No requests yet.</p>}
          {claims.map((claim) => (
            <div key={claim.id} className="bg-surface rounded-card p-3.5 shadow-sm shadow-black/5 flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium text-ink truncate">
                {goalById.get(claim.goalId)?.name ?? "Deleted goal"}
              </p>
              <span className={`text-[12px] font-semibold shrink-0 ${STATUS_CLASS[claim.status]}`}>
                {STATUS_LABEL[claim.status]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
