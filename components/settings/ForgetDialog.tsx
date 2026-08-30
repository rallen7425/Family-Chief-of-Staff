"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { forgetEverything, forgetMemberInfo } from "@/lib/actions/familyMembers";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

interface ForgetDialogProps {
  open: boolean;
  onClose: () => void;
  members: FamilyMember[];
  /** When set, skips the member picker and scopes straight to this person. */
  preselectedMemberId?: string;
}

type Step = "choose" | "warning" | "done";

export function ForgetDialog({ open, onClose, members, preselectedMemberId }: ForgetDialogProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(preselectedMemberId ?? null);
  const [scope, setScope] = useState<"person" | "all">("person");
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const selected = members.find((m) => m.id === selectedId) ?? null;
  const who = scope === "all" ? "every family member" : selected?.name ?? "this person";

  function reset() {
    setStep("choose");
    setScope("person");
    setSelectedId(preselectedMemberId ?? null);
    setError(null);
  }
  function close() {
    reset();
    onClose();
  }

  function confirm() {
    setError(null);
    start(async () => {
      const res = scope === "all" ? await forgetEverything() : await forgetMemberInfo(selected!.id);
      if (res.error) return setError(res.error);
      setStep("done");
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={close} title="Forget information">
      {step === "choose" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted-text leading-relaxed">
            Permanently deletes profile details. Names and calendar history are always kept so past
            events stay intact.
          </p>

          {!preselectedMemberId && (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[13px] font-medium border transition-colors ${
                    selectedId === m.id
                      ? "bg-ink text-white border-ink"
                      : "bg-surface text-muted-text border-border hover:bg-mist"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: ACCENT_HEX[m.accentColor] }}
                  />
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <button
              type="button"
              onClick={() => {
                setScope("person");
                setStep("warning");
              }}
              className="w-full py-3 rounded-input border border-accent-berry text-accent-berry text-[14px] font-semibold hover:bg-accent-berry/5 transition-colors"
            >
              Forget {selected.name}&rsquo;s info
            </button>
          )}

          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setScope("all");
                setStep("warning");
              }}
              className="w-full py-3 rounded-input bg-accent-berry/10 text-accent-berry text-[14px] font-semibold hover:bg-accent-berry/15 transition-colors"
            >
              Forget everything for the whole family
            </button>
          </div>
        </div>
      )}

      {step === "warning" && (
        <div className="rounded-input bg-accent-berry/10 p-4 flex flex-col gap-2.5">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-accent-berry leading-snug">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            {scope === "all" ? "Forget everything for the whole family?" : `Forget ${who}'s info?`}
          </p>
          <p className="text-[12.5px] text-muted-text leading-relaxed">
            This will reduce how well {who === "every family member" ? "the app" : "the app"}{" "}
            understands {who} — suggestions, arrival estimates, and reminders may get less accurate
            until the details are re-added. This can&rsquo;t be undone.
          </p>
          {error && <p className="text-[12.5px] text-accent-berry font-medium">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setStep("choose")}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-input border border-border text-muted-text text-[14px] font-semibold hover:bg-mist transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-input bg-accent-berry text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isPending ? "Forgetting…" : "Yes, forget it"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-ink">
            {scope === "all"
              ? "Everyone's saved details have been forgotten."
              : `${selected?.name}'s saved details have been forgotten.`}
          </p>
          <button
            type="button"
            onClick={close}
            className="w-full py-3 rounded-input bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
