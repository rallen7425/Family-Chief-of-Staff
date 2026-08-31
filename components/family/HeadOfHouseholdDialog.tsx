"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import { setHeadOfHousehold } from "@/lib/actions/familyMembers";
import { computeIsAdult, initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

export function HeadOfHouseholdDialog({
  open,
  onClose,
  members,
}: {
  open: boolean;
  onClose: () => void;
  members: FamilyMember[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(m: FamilyMember) {
    setError(null);
    setPendingId(m.id);
    start(async () => {
      const res = await setHeadOfHousehold(m.id, !m.isHeadOfHousehold);
      setPendingId(null);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Head of Household">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-muted-label leading-relaxed">
          Toggle who&rsquo;s marked head of household. More than one person can hold it.
          Informational only for now — it doesn&rsquo;t restrict what anyone can do in the app yet.
        </p>
        {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}
        <div className="flex flex-col">
          {members.map((m) => {
            const eligible = computeIsAdult(m.birthday ?? null);
            const on = m.isHeadOfHousehold;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-2.5 border-b border-[#F1F3F6] last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                    style={{ background: ACCENT_HEX[m.accentColor] }}
                  >
                    {initialsOf(m.name)}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{m.name}</p>
                    {m.relationship && (
                      <p className="text-[11.5px] text-muted-label">{m.relationship}</p>
                    )}
                  </div>
                </div>
                {eligible ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Head of household: ${m.name}`}
                    disabled={pendingId === m.id}
                    onClick={() => toggle(m)}
                    className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
                      on ? "bg-primary" : "bg-border"
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white transition-[margin] ${on ? "ml-4" : "ml-0"}`}
                    />
                  </button>
                ) : (
                  <span className="text-[10.5px] font-semibold text-border shrink-0">Under 18</span>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-input bg-primary text-white text-[14px] font-semibold"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
