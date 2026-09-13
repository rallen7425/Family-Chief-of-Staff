"use client";

import { useState, useTransition } from "react";
import { completeNewAdultProfile } from "@/lib/actions/invites";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[15px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** A brand-new co-parent invite has no name/birthdate on file yet — this
 * is the abbreviated "create your profile" step the plan doc calls for
 * (Stage E point 3), attaching to the *existing* household from the
 * accepted invite rather than creating a new one. */
export function NewAdultProfileForm() {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await completeNewAdultProfile({ name, birthday });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[24px] font-bold text-ink">Finish your profile</h1>
        <p className="text-[13px] leading-relaxed text-muted-label">
          Just a couple of things so the rest of the household knows who you are.
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
            placeholder="e.g. Kim Allen"
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-muted-text">
            Birthdate <span className="text-accent-berry">*</span>
          </label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={INPUT_CLASS} />
        </div>
      </div>

      {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded-input bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
