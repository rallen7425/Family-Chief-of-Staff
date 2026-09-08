"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createGoal, updateGoal, deleteGoal, type GoalInput } from "@/lib/actions/goals";
import { MultiOwnerPicker } from "@/components/entries/MultiOwnerPicker";
import type { FamilyMember, Goal } from "@/lib/types";

interface GoalFormProps {
  kids: FamilyMember[];
  goal?: Goal;
}

export function GoalForm({ kids, goal }: GoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [name, setName] = useState(goal?.name ?? "");
  const [pointsNeeded, setPointsNeeded] = useState(goal?.pointsNeeded ?? 100);
  const [needsApproval, setNeedsApproval] = useState(goal?.needsApproval ?? true);
  const [active, setActive] = useState(goal?.active ?? true);
  const [availableMemberIds, setAvailableMemberIds] = useState<string[]>(goal?.availableMemberIds ?? []);

  function handleSave() {
    const input: GoalInput = { name, pointsNeeded, needsApproval, active, availableMemberIds };
    startTransition(async () => {
      const res = goal ? await updateGoal(goal.id, input) : await createGoal(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/chores/goals");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!goal) return;
    startTransition(async () => {
      const res = await deleteGoal(goal.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/chores/goals");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Extra screen time"
          className="w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Points needed
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPointsNeeded((p) => Math.max(1, p - 25))}
            aria-label="Fewer points"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-[16px] font-semibold text-ink tabular-nums w-20 text-center">{pointsNeeded} pts</span>
          <button
            type="button"
            onClick={() => setPointsNeeded((p) => p + 25)}
            aria-label="More points"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Available to
        </label>
        <MultiOwnerPicker familyMembers={kids} selectedIds={availableMemberIds} onChange={setAvailableMemberIds} />
        <p className="text-[12px] text-muted-label mt-1.5">Leave empty for all kids.</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium text-ink">Needs my OK to fulfill</p>
          <p className="text-[12px] text-muted-label">A claim waits in your queue until you approve it</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={needsApproval}
          onClick={() => setNeedsApproval((v) => !v)}
          className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
            needsApproval ? "bg-primary" : "bg-border"
          }`}
        >
          <span className={`w-5 h-5 rounded-full bg-white transition-[margin] ${needsApproval ? "ml-4" : "ml-0"}`} />
        </button>
      </div>

      {goal && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-ink">Active</p>
            <p className="text-[12px] text-muted-label">Inactive goals stop appearing anywhere</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
              active ? "bg-primary" : "bg-border"
            }`}
          >
            <span className={`w-5 h-5 rounded-full bg-white transition-[margin] ${active ? "ml-4" : "ml-0"}`} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="w-full py-3 rounded-pill bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {goal ? "Save changes" : "Create goal"}
      </button>

      {goal && (
        <div className="mt-2 pt-4 border-t border-border">
          <p className="text-[12px] font-bold tracking-widest text-accent-berry uppercase mb-2">Danger zone</p>
          {confirmingDelete ? (
            <div className="rounded-card bg-accent-berry/5 p-3.5 flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink">Delete this goal for good?</p>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-[13px] font-medium text-muted-text hover:bg-mist rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-3 py-1.5 text-[13px] font-semibold text-white bg-accent-berry rounded-md hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-[13px] font-semibold text-accent-berry hover:underline"
            >
              Delete goal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
