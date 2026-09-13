"use client";

import { useState, useTransition } from "react";
import { setApprovalAuthority } from "@/lib/actions/onboarding";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

/** Stage D — approval-authority confirm/reassign only. Per-member view
 * scope / submission tier are deliberately not set here: they're only
 * meaningful once a member actually has a login, which happens at invite
 * time (Phase 5), not speculatively for people who may never activate one. */
export function PermissionsForm({
  members,
  currentHolderId,
  selfId,
}: {
  members: FamilyMember[];
  currentHolderId: string | null;
  selfId: string;
}) {
  const [selected, setSelected] = useState(currentHolderId ?? selfId);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const holder = members.find((m) => m.id === selected);

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const result = await setApprovalAuthority(selected);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingProgress step={3} label="Step 3 of 4" />
      <div className="flex flex-1 flex-col gap-5 py-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[24px] font-bold text-ink">Set up permissions</h1>
          <p className="text-[13px] text-muted-label">You can change any of this later in household settings.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-muted-label">Approval authority</h2>
          {!changing ? (
            <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ background: holder ? ACCENT_HEX[holder.accentColor] : undefined }}
              >
                {holder?.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">
                  {holder ? (holder.id === selfId ? `${holder.name} (you)` : holder.name) : "—"}
                </p>
                <p className="text-[12px] text-muted-label">Approves submissions &amp; requests</p>
              </div>
              {members.length > 1 && (
                <button type="button" onClick={() => setChanging(true)} className="text-[13px] font-bold text-primary">
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelected(m.id);
                    setChanging(false);
                  }}
                  className={`flex items-center gap-3 rounded-input p-2.5 text-left transition-colors hover:bg-mist ${
                    selected === m.id ? "bg-primary/10" : ""
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: ACCENT_HEX[m.accentColor] }}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[14px] font-medium text-ink">
                    {m.id === selfId ? `${m.name} (you)` : m.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-muted-label">Everyone else</h2>
          <div className="rounded-input bg-primary/10 p-3.5">
            <p className="text-[12.5px] leading-relaxed text-primary-hover">
              Everyone else in your household is added as a profile only for now. When you invite someone
              to create their own login, you&rsquo;ll set what they can view and submit at that moment.
            </p>
          </div>
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
