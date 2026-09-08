"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ChevronRight } from "lucide-react";
import { resolveGoalClaimAction } from "@/lib/actions/goals";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember, Goal, GoalClaim } from "@/lib/types";

interface PendingClaimWithMember {
  claim: GoalClaim;
  member?: FamilyMember;
  goal?: Goal;
}

interface GoalsParentProps {
  pendingClaims: PendingClaimWithMember[];
  goals: Goal[];
  kids: FamilyMember[];
}

export function GoalsParent({ pendingClaims, goals, kids }: GoalsParentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function resolve(claimId: string, decision: "achieved" | "denied") {
    startTransition(async () => {
      await resolveGoalClaimAction(claimId, decision);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Goals</h1>
        <Link
          href="/chores/goals/new"
          className="px-4 py-2 rounded-pill bg-primary text-white text-[13px] font-semibold shrink-0 hover:bg-primary-hover transition-colors"
        >
          + Add Goal
        </Link>
      </div>

      {pendingClaims.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">Pending requests</h2>
          <div className="flex flex-col gap-2.5">
            {pendingClaims.map(({ claim, member, goal }) => (
              <div key={claim.id} className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5">
                {member && (
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold font-display shrink-0"
                    style={{ background: ACCENT_HEX[member.accentColor] }}
                  >
                    {member.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{goal?.name ?? "Deleted goal"}</p>
                  <p className="text-[12px] text-muted-label">
                    {member?.name ?? "Unknown"} · {claim.pointsSpent} pts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resolve(claim.id, "denied")}
                  disabled={isPending}
                  aria-label="Deny"
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors disabled:opacity-40 shrink-0"
                >
                  <X size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => resolve(claim.id, "achieved")}
                  disabled={isPending}
                  aria-label="Fulfill"
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors disabled:opacity-40 shrink-0"
                >
                  <Check size={15} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">Goal catalog</h2>
        <div className="flex flex-col gap-2">
          {goals.length === 0 && <p className="text-[14px] text-muted-label">No goals yet.</p>}
          {goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/chores/goals/${goal.id}`}
              className={`bg-surface rounded-card p-3.5 shadow-sm shadow-black/5 flex items-center gap-3 hover:bg-mist/40 transition-colors ${
                goal.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-ink truncate">{goal.name}</p>
                <p className="text-[12px] text-muted-label">
                  {goal.pointsNeeded} pts ·{" "}
                  {goal.availableMemberIds.length === 0
                    ? "All kids"
                    : goal.availableMemberIds.map((id) => kids.find((k) => k.id === id)?.name).filter(Boolean).join(", ")}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-label shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
