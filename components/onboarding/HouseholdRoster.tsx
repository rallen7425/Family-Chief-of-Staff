"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import { AddHouseholdMemberForm } from "@/components/onboarding/AddHouseholdMemberForm";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ACCENT_HEX } from "@/lib/colors";
import { ageInYears } from "@/lib/family";
import type { FamilyMember } from "@/lib/types";

/** Stage C ("Setting Up the Household") — manual add only for this phase.
 * The design canvas's AI-wizard entry point is deliberately not built yet:
 * its ambiguous-birthdate handling (e.g. "Emma just turned 6" with no
 * exact date) is an open decision per the implementation prompt, not
 * something to guess at. Roster rows also omit the canvas's "Invite to
 * create login" action — that needs the outbound-email decision, Phase 5. */
export function HouseholdRoster({
  householdName,
  self,
  members,
}: {
  householdName: string | null;
  self: FamilyMember;
  members: FamilyMember[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingProgress step={2} label="Step 2 of 4" />
      <div className="flex flex-1 flex-col gap-3.5 py-4">
        <div className="flex flex-col gap-1">
          {householdName && (
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{householdName}</p>
          )}
          <h1 className="font-display text-[22px] font-bold text-ink">Setting up your household</h1>
          <p className="text-[13px] leading-relaxed text-muted-label">
            Add everyone — kids too. Minimum: name, relationship, birthdate.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: ACCENT_HEX[self.accentColor] }}
            >
              {self.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[14px] font-semibold text-ink">{self.name} (you)</span>
            <span className="ml-auto text-[12px] text-muted-label">Head of Household</span>
          </div>

          {members.map((m) => {
            const age = ageInYears(m.birthday ?? null);
            return (
              <div key={m.id} className="rounded-card border border-border bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: ACCENT_HEX[m.accentColor] }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink">{m.name}</p>
                    <p className="text-[12px] text-muted-label">
                      {m.relationship || "Family"}
                      {age !== null ? ` · age ${age}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 rounded-card border border-dashed border-border py-3.5 text-[14px] font-semibold text-muted-text transition-colors hover:bg-mist"
          >
            + Add family member
          </button>

          <p className="px-0.5 text-[11px] leading-relaxed text-muted-label">
            Everyone&rsquo;s added as a profile you can view and manage. Give someone their own login
            anytime — now or later, from household settings.
          </p>
        </div>

        <Link
          href="/onboarding/permissions"
          className="mt-auto rounded-input bg-primary py-3.5 text-center text-[15px] font-bold text-white transition-colors hover:bg-primary-hover"
        >
          Continue
        </Link>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add family member">
        <AddHouseholdMemberForm
          onSuccess={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </div>
  );
}
