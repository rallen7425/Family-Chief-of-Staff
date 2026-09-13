"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signInWithPasswordAction, signInWithGoogleAction } from "@/lib/actions/auth";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-2.5 text-[14px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Per the "Identity & Onboarding" design canvas's SignIn artboard —
 * matches its layout/spacing exactly, on this app's real design tokens
 * rather than the mockup's inline hex values. Microsoft sign-in omitted
 * per this pass's decision to defer it (no Azure app registration exists
 * for anything in the portfolio yet). */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSignIn() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithPasswordAction(email, password);
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
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 11.5 12 4l8 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 10.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-display text-[19px] font-bold leading-none text-ink">Family Chief of Staff</p>
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[22px] font-bold text-ink">Welcome back</h1>
          <p className="text-[13px] text-muted-label">Sign in to your household</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted-text">Email</label>
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
            <label className="text-[12px] font-semibold text-muted-text">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[12px] font-semibold text-muted-label">Forgot password?</span>
          </div>
        </div>

        {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isPending}
          className="rounded-input bg-primary py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign In"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-label">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isPending}
          className="flex items-center justify-center gap-2.5 rounded-input border border-border bg-surface py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-mist disabled:opacity-60"
        >
          <GoogleIcon /> Sign in with Google
        </button>

        <p className="text-center text-[13px] text-muted-label">
          New here?{" "}
          <Link href="/signup" className="font-bold text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
