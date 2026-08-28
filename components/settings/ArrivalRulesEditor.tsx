"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { createArrivalRule, deleteArrivalRule, updateArrivalRule } from "@/lib/actions/arrivalRules";
import type { ArrivalBufferRule } from "@/lib/arrival";

const STEP = 5;
const MIN = 0;
const MAX = 180;
const CATEGORIES = ["game", "practice", "rehearsal", "appointment", "other"] as const;

function ruleLabel(rule: ArrivalBufferRule): string {
  return rule.category ? rule.category[0].toUpperCase() + rule.category.slice(1) : "General (kids' activities)";
}

function ruleCaption(rule: ArrivalBufferRule): string {
  return rule.category
    ? "Overrides the general default for this category"
    : "Any event whose Subject is a child";
}

export function ArrivalRulesEditor({ rules }: { rules: ArrivalBufferRule[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function bump(rule: ArrivalBufferRule, delta: number) {
    const next = Math.max(MIN, Math.min(MAX, rule.bufferMinutes + delta));
    if (next === rule.bufferMinutes) return;
    startTransition(async () => {
      const res = await updateArrivalRule(rule.id, { bufferMinutes: next });
      if (res.error) setError(res.error);
    });
  }

  function setCategory(rule: ArrivalBufferRule, category: string) {
    startTransition(async () => {
      const res = await updateArrivalRule(rule.id, { category: category || null });
      if (res.error) setError(res.error);
    });
  }

  function remove(rule: ArrivalBufferRule) {
    startTransition(async () => {
      const res = await deleteArrivalRule(rule.id);
      if (res.error) setError(res.error);
    });
  }

  function add() {
    startTransition(async () => {
      const res = await createArrivalRule({ category: "practice", bufferMinutes: 15 });
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

      {rules.map((rule) => {
        const removable = rule.category != null;
        return (
          <div key={rule.id} className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {removable ? (
                <select
                  value={rule.category ?? ""}
                  onChange={(e) => setCategory(rule, e.target.value)}
                  disabled={isPending}
                  className="text-[15px] font-semibold text-ink bg-transparent focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[15px] font-semibold text-ink">{ruleLabel(rule)}</p>
              )}
              <p className="text-[12px] text-muted-label mt-0.5">{ruleCaption(rule)}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => bump(rule, -STEP)}
                disabled={isPending || rule.bufferMinutes <= MIN}
                aria-label="Less"
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="text-[14px] font-semibold text-ink tabular-nums w-14 text-center">
                {rule.bufferMinutes} min
              </span>
              <button
                type="button"
                onClick={() => bump(rule, STEP)}
                disabled={isPending || rule.bufferMinutes >= MAX}
                aria-label="More"
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>

            {removable && (
              <button
                type="button"
                onClick={() => remove(rule)}
                disabled={isPending}
                aria-label="Remove rule"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-label hover:bg-mist hover:text-accent-berry transition-colors shrink-0 disabled:opacity-40"
              >
                <X size={15} />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        disabled={isPending}
        className="rounded-card border border-dashed border-primary/50 text-primary text-[14px] font-semibold py-3 hover:bg-primary/5 transition-colors disabled:opacity-50"
      >
        + Add rule
      </button>

      <div className="mt-2 rounded-card bg-[#EEF2FB] p-4">
        <p className="text-[13px] text-[#2C56C4] leading-relaxed">
          <span className="font-semibold">Example:</span> Ben has a game at 5:00 PM with no arrival time in the
          email. The <span className="font-semibold">Game</span> rule fills in an arrival of 4:00 PM (60 min
          early). A regular practice with no <span className="font-semibold">Game</span>-category match would use
          the general 15-minute default instead. You can always override a single entry&rsquo;s arrival time by
          hand.
        </p>
      </div>
    </div>
  );
}
