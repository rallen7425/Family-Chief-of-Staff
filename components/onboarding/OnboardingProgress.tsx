"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Shared progress header for the onboarding flow's 4 steps — matches the
 * "Identity & Onboarding" design canvas's step bar exactly. */
export function OnboardingProgress({ step, label }: { step: number; label: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3.5 pb-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-muted-text transition-colors hover:text-ink"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="text-[13px] font-semibold text-muted-label">{label}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
