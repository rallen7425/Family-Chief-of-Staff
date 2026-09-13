"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/shared/Modal";
import {
  inviteExistingMemberByCode,
  inviteExistingMemberByEmail,
  type ViewScope,
  type SubmissionTier,
} from "@/lib/actions/invites";
import { ACCENT_HEX } from "@/lib/colors";
import { ageInYears } from "@/lib/family";
import type { FamilyMember } from "@/lib/types";

const PILL_BASE =
  "flex-1 text-center rounded-input border px-3 py-2 text-[13px] font-semibold transition-colors";
const PILL_ACTIVE = "border-primary bg-primary/10 text-primary-hover";
const PILL_INACTIVE = "border-border text-muted-text hover:bg-mist";

/** Matches the design canvas's InviteMemberLogin artboard — reachable from
 * a household-roster row's "Invite to create login" action (Stage E,
 * activate_member case). */
export function InviteMemberModal({ member, onClose }: { member: FamilyMember; onClose: () => void }) {
  const [method, setMethod] = useState<"email" | "join_code">("email");
  const [email, setEmail] = useState(member.email ?? "");
  const [viewScope, setViewScope] = useState<ViewScope>("siblings");
  const [submissionTier, setSubmissionTier] = useState<SubmissionTier>("requires_approval");
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState(false);
  const [isPending, startTransition] = useTransition();

  const age = ageInYears(member.birthday ?? null);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      if (method === "join_code") {
        const result = await inviteExistingMemberByCode({ memberId: member.id, viewScope, submissionTier });
        if (result.error) return setError(result.error);
        setJoinCode(result.joinCode ?? null);
      } else {
        const result = await inviteExistingMemberByEmail({
          memberId: member.id,
          email,
          viewScope,
          submissionTier,
        });
        if (result.error) return setError(result.error);
        setSentEmail(true);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={`Invite ${member.name} to create a login`}>
      {joinCode ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-[13px] text-muted-text">
            Share this code with {member.name} — they&rsquo;ll enter it at your household&rsquo;s join page.
          </p>
          <p className="rounded-input border border-border bg-mist px-6 py-4 font-display text-[28px] font-bold tracking-[0.15em] text-ink">
            {joinCode}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-input bg-primary px-5 py-2.5 text-[14px] font-bold text-white hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      ) : sentEmail ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-[14px] font-medium text-accent-teal">Invite sent to {email}.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-input bg-primary px-5 py-2.5 text-[14px] font-bold text-white hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-muted-label">
            Set what {member.name} can see and do before you send the invite. You can change this anytime.
          </p>

          <div className="flex items-center gap-3 rounded-card border border-border bg-mist p-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: ACCENT_HEX[member.accentColor] }}
            >
              {member.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex-1">
              <p className="text-[14.5px] font-semibold text-ink">{member.name}</p>
              <p className="text-[12px] text-muted-label">
                {member.relationship || "Family"}
                {age !== null ? ` · age ${age}` : ""}
              </p>
            </div>
            <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-label">
              Profile only
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-muted-text">Send invite via</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`${PILL_BASE} ${method === "email" ? PILL_ACTIVE : PILL_INACTIVE}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setMethod("join_code")}
                className={`${PILL_BASE} ${method === "join_code" ? PILL_ACTIVE : PILL_INACTIVE}`}
              >
                Join code
              </button>
            </div>
            {method === "email" && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${member.name.toLowerCase()}@email.com`}
                className="rounded-input border border-border bg-mist px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3.5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-label">
              Permissions for this login
            </p>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-muted-text">Can view</p>
              <div className="flex gap-2">
                {(["own", "siblings", "household"] as ViewScope[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewScope(v)}
                    className={`${PILL_BASE} ${viewScope === v ? PILL_ACTIVE : PILL_INACTIVE}`}
                  >
                    {v === "own" ? "Own" : v === "siblings" ? "Siblings" : "Household"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-muted-text">Submitting events &amp; tasks</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubmissionTier("requires_approval")}
                  className={`${PILL_BASE} ${submissionTier === "requires_approval" ? PILL_ACTIVE : PILL_INACTIVE}`}
                >
                  Requires approval
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionTier("independent")}
                  className={`${PILL_BASE} ${submissionTier === "independent" ? PILL_ACTIVE : PILL_INACTIVE}`}
                >
                  Independent
                </button>
              </div>
            </div>
          </div>

          <p className="px-0.5 text-[11px] leading-relaxed text-muted-label">
            {member.name}&rsquo;s profile stays as-is until they accept — their info won&rsquo;t change,
            they&rsquo;ll just be able to sign in as themselves.
          </p>

          {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || (method === "email" && !email.trim())}
            className="rounded-input bg-primary py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send invite"}
          </button>
        </div>
      )}
    </Modal>
  );
}
