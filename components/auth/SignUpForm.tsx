"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUpWithPasswordAction, signInWithGoogleAction } from "@/lib/actions/auth";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[15px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Per the "Identity & Onboarding" design canvas's CreateAccount artboard —
 * credentials only, no name field (Stage A of the plan doc's onboarding
 * flow; the account holder's own identity is captured next, at
 * /onboarding/profile — Phase 4, not built yet). Microsoft omitted per
 * this pass's decision to defer it. */
export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await signUpWithPasswordAction(email, password);
      if (result?.error) setError(result.error);
    });
  }

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold text-ink">Create your account</h1>
        <p className="text-[14px] leading-relaxed text-muted-label">
          Just your login for now — you&rsquo;ll build your profile next.
        </p>
      </div>

      <div className="flex flex-col gap-4.5 rounded-card border border-border bg-surface p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-muted-text">Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-muted-text">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="rounded-input bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create Account"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-muted-label">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isPending}
          className="flex items-center justify-center gap-2.5 rounded-input border border-border bg-surface py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-mist disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>
      </div>

      <p className="text-center text-[13px] text-muted-label">
        Already have an account?{" "}
        <Link href="/signin" className="font-bold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
