"use client";

import { useState, useTransition } from "react";
import { createProfileAndHousehold } from "@/lib/actions/onboarding";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[15px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Stage B ("Create your profile") — the real first onboarding step per
 * the plan doc: the account holder's own identity, plus an inline
 * optional household-name field. Matches the design canvas's
 * OnboardingProfile artboard, minus the optional "Connect Gmail &
 * Calendar" card — deliberately deferred: it would need to identify "who's
 * connecting" from this real session, but the existing connector flow
 * (app/api/connectors/google/start) still resolves that from the
 * fcos_active_member device cookie, a different identity source. Wiring
 * that correctly is separate work, not part of this phase. */
export function OnboardingProfileForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const result = await createProfileAndHousehold({ name, birthday, phone, householdName });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingProgress step={1} label="Step 1 of 4" />
      <div className="flex flex-1 flex-col gap-5 py-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[24px] font-bold text-ink">Create your profile</h1>
          <p className="text-[13px] leading-relaxed text-muted-label">
            This is you — you&rsquo;ll add the rest of your household next.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">
              Your name <span className="text-accent-berry">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Allen"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">
              Birthdate <span className="text-accent-berry">*</span>
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">Email</label>
            <input type="text" value={email} readOnly disabled className={`${INPUT_CLASS} text-muted-label`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">
              Phone <span className="font-normal text-muted-label">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0100"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-input bg-primary/10 p-3.5">
          <p className="text-[12px] leading-relaxed text-primary-hover">
            <strong>You&rsquo;re set as Head of Household</strong> — reassignable later, and separate from
            approval authority (confirmed in Step 3).
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-ink">Name your household</span>
            <span className="ml-auto rounded bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-label">
              Optional
            </span>
          </div>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. The Allen Family"
            className={INPUT_CLASS}
          />
          <p className="text-[11px] leading-relaxed text-muted-label">
            Leave blank and we&rsquo;ll ask again before setting up your household — or skip it entirely for
            now.
          </p>
        </div>

        {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={isPending}
          className="mt-auto rounded-input bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
