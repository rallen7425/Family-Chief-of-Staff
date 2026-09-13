"use client";

import { useState, useTransition } from "react";
import { inviteCoParent, finishOnboarding } from "@/lib/actions/invites";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[15px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Stage E ("new_adult" case) / Step 4 of 4 — optional co-parent invite.
 * Sending an invite and finishing onboarding are deliberately separate
 * actions, matching the design canvas (a sent invite doesn't itself end
 * onboarding). */
export function OnboardingInviteForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await inviteCoParent(email);
      if (result?.error) return setError(result.error);
      setSent(true);
    });
  }

  function handleFinish() {
    startTransition(async () => {
      await finishOnboarding();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingProgress step={4} label="Step 4 of 4" />
      <div className="flex flex-1 flex-col gap-5 py-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[24px] font-bold text-ink">Invite a co-parent?</h1>
          <p className="text-[13px] leading-relaxed text-muted-label">
            Optional — bring in another parent or caregiver as a second Head of Household-eligible
            adult. To give someone already in your household their own login instead, do that anytime
            from the household roster.
          </p>
        </div>

        <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-muted-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              disabled={sent}
              className={INPUT_CLASS}
            />
          </div>
          {sent ? (
            <p className="text-[13px] font-medium text-accent-teal">Invite sent to {email}.</p>
          ) : (
            <>
              {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !email.trim()}
                className="rounded-input border border-primary bg-surface py-3 text-[14px] font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
              >
                {isPending ? "Sending…" : "Send invite"}
              </button>
            </>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            className="rounded-input bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            Finish setup
          </button>
        </div>
      </div>
    </div>
  );
}
