"use client";

import { useState, useTransition } from "react";
import { setHouseholdName } from "@/lib/actions/onboarding";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

/** Shown only when Stage B's inline household-name field was left blank —
 * matches the design canvas's NameHousehold artboard. */
export function NameHouseholdForm({ householdId }: { householdId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await setHouseholdName(householdId, value);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingProgress step={1} label="Before Step 2" />
      <div className="flex flex-1 flex-col gap-6 pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] font-bold text-ink">Name your household?</h1>
          <p className="text-[14px] leading-relaxed text-muted-label">
            You skipped this on the last screen — it shows up in headers and invites. Totally fine to do
            later too.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-muted-text">Household name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Allen Family"
            className="rounded-input border border-border bg-surface px-3.5 py-3.5 font-display text-[17px] font-semibold text-ink placeholder:font-body placeholder:font-normal placeholder:text-muted-label focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

        <div className="mt-auto flex flex-col gap-3">
          <button
            type="button"
            onClick={() => submit(name)}
            disabled={isPending}
            className="rounded-input bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save & continue"}
          </button>
          <button
            type="button"
            onClick={() => submit("")}
            disabled={isPending}
            className="text-center text-[13px] font-semibold text-muted-label disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
