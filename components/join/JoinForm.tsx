"use client";

import { useState, useTransition } from "react";
import { redeemJoinCode } from "@/lib/actions/invites";
import { ACCENT_HEX } from "@/lib/colors";
import type { AccentColor } from "@/lib/types";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[14px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Matches the design canvas's JoinHousehold artboard — the join-code
 * variant (identity + birthdate pre-filled from the code, matching what's
 * already on file; email/password collected here since Supabase Auth
 * needs an identifier even though the code itself never went via email). */
export function JoinForm({
  code,
  householdName,
  memberName,
  memberBirthday,
  memberAccentColor,
}: {
  code: string;
  householdName: string;
  memberName: string;
  memberBirthday: string | null;
  memberAccentColor: AccentColor;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await redeemJoinCode({ code, email, password });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 11.5 12 4l8 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 10.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[12px] font-semibold text-muted-label">You&rsquo;ve been invited to join</p>
      </div>

      <div className="flex flex-col gap-4.5 rounded-card border border-border bg-surface p-6 shadow-sm shadow-black/5">
        <p className="font-display text-[20px] font-bold text-ink">{householdName}</p>

        <div className="flex items-center gap-3 rounded-input border border-border bg-mist p-3.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: ACCENT_HEX[memberAccentColor] }}
          >
            {memberName.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex-1">
            <p className="text-[14.5px] font-semibold text-ink">{memberName}</p>
            {memberBirthday && (
              <p className="text-[12px] text-muted-label">
                b. {new Date(`${memberBirthday}T00:00:00`).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">Create a password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !email.trim() || password.length < 8}
          className="rounded-input bg-primary py-3 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Joining…" : `Join ${householdName}`}
        </button>
      </div>
    </div>
  );
}
