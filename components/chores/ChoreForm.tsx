"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createChore, updateChore, deleteChore, type ChoreInput } from "@/lib/actions/chores";
import { MultiOwnerPicker } from "@/components/entries/MultiOwnerPicker";
import { TimePickerButton } from "@/components/shared/TimePickerButton";
import type { Chore, ChoreFrequency, ChoreTimeWindow, FamilyMember } from "@/lib/types";

const FREQUENCIES: { value: ChoreFrequency; label: string }[] = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

const TIME_WINDOWS: { value: ChoreTimeWindow; label: string }[] = [
  { value: "before_school", label: "Before School" },
  { value: "after_school", label: "After School" },
  { value: "evening", label: "Evening" },
  { value: "anytime", label: "Anytime" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function segmentClass(active: boolean) {
  return active
    ? "flex-1 px-3 py-2 rounded-input bg-primary text-white text-[13px] font-semibold text-center"
    : "flex-1 px-3 py-2 rounded-input bg-mist border border-border text-muted-text text-[13px] font-medium text-center hover:bg-border/30 transition-colors";
}

function timeToPicker(time?: string | null): string {
  return time ? time.slice(0, 5) : "";
}

interface ChoreFormProps {
  kids: FamilyMember[];
  chore?: Chore;
}

export function ChoreForm({ kids, chore }: ChoreFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [title, setTitle] = useState(chore?.title ?? "");
  const [points, setPoints] = useState(chore?.points ?? 10);
  const [frequency, setFrequency] = useState<ChoreFrequency>(chore?.frequency ?? "daily");
  const [frequencyDays, setFrequencyDays] = useState<number[]>(chore?.frequencyDays ?? []);
  const [timeWindow, setTimeWindow] = useState<ChoreTimeWindow>(chore?.timeWindow ?? "anytime");
  const [hasDeadline, setHasDeadline] = useState(!!chore?.deadlineTime);
  const [deadlineTime, setDeadlineTime] = useState(timeToPicker(chore?.deadlineTime));
  const [isPinned, setIsPinned] = useState(chore?.isPinned ?? false);
  const [active, setActive] = useState(chore?.active ?? true);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(chore?.assigneeMemberIds ?? []);

  function toggleDay(day: number) {
    setFrequencyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleSave() {
    const input: ChoreInput = {
      title,
      points,
      frequency,
      frequencyDays: frequency === "weekly" || frequency === "custom" ? frequencyDays : null,
      deadlineTime: hasDeadline ? deadlineTime || null : null,
      timeWindow,
      isPinned,
      active,
      assigneeMemberIds: assigneeIds,
    };
    startTransition(async () => {
      const res = chore ? await updateChore(chore.id, input) : await createChore(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/chores");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!chore) return;
    startTransition(async () => {
      const res = await deleteChore(chore.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/chores");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Take out the trash"
          className="w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Assign to
        </label>
        <MultiOwnerPicker familyMembers={kids} selectedIds={assigneeIds} onChange={setAssigneeIds} />
      </div>

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Frequency
        </label>
        <div className="flex gap-1.5">
          {FREQUENCIES.map((f) => (
            <button key={f.value} type="button" onClick={() => setFrequency(f.value)} className={segmentClass(frequency === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        {(frequency === "weekly" || frequency === "custom") && (
          <div className="flex gap-1.5 mt-2.5">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-full text-[12px] font-semibold shrink-0 transition-colors ${
                  frequencyDays.includes(i)
                    ? "bg-primary text-white"
                    : "bg-mist border border-border text-muted-text hover:bg-border/30"
                }`}
              >
                {d[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          When
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {TIME_WINDOWS.map((w) => (
            <button key={w.value} type="button" onClick={() => setTimeWindow(w.value)} className={segmentClass(timeWindow === w.value)}>
              {w.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted-label mt-1.5">Drives when this chore can appear in Right Now.</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium text-ink">Deadline</p>
          <p className="text-[12px] text-muted-label">Optional daily cutoff time</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hasDeadline}
          onClick={() => setHasDeadline((v) => !v)}
          className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
            hasDeadline ? "bg-primary" : "bg-border"
          }`}
        >
          <span className={`w-5 h-5 rounded-full bg-white transition-[margin] ${hasDeadline ? "ml-4" : "ml-0"}`} />
        </button>
      </div>
      {hasDeadline && <TimePickerButton value={deadlineTime} onChange={setDeadlineTime} placeholder="Pick a deadline" />}

      <div>
        <label className="text-[12px] font-semibold text-muted-label uppercase tracking-wide mb-1.5 block">
          Points
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPoints((p) => Math.max(1, p - 5))}
            aria-label="Fewer points"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-[16px] font-semibold text-ink tabular-nums w-16 text-center">{points} pts</span>
          <button
            type="button"
            onClick={() => setPoints((p) => p + 5)}
            aria-label="More points"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium text-ink">Pin as Right Now priority</p>
          <p className="text-[12px] text-muted-label">Wins the tie-break when more than one chore is eligible</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPinned}
          onClick={() => setIsPinned((v) => !v)}
          className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
            isPinned ? "bg-primary" : "bg-border"
          }`}
        >
          <span className={`w-5 h-5 rounded-full bg-white transition-[margin] ${isPinned ? "ml-4" : "ml-0"}`} />
        </button>
      </div>

      {chore && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-ink">Active</p>
            <p className="text-[12px] text-muted-label">Inactive chores stop appearing anywhere</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            className={`w-10 h-6 rounded-full flex items-center p-0.5 shrink-0 transition-colors ${
              active ? "bg-primary" : "bg-border"
            }`}
          >
            <span className={`w-5 h-5 rounded-full bg-white transition-[margin] ${active ? "ml-4" : "ml-0"}`} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !title.trim()}
        className="w-full py-3 rounded-pill bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {chore ? "Save changes" : "Create chore"}
      </button>

      {chore && (
        <div className="mt-2 pt-4 border-t border-border">
          <p className="text-[12px] font-bold tracking-widest text-accent-berry uppercase mb-2">Danger zone</p>
          {confirmingDelete ? (
            <div className="rounded-card bg-accent-berry/5 p-3.5 flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink">Delete this chore for good?</p>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-[13px] font-medium text-muted-text hover:bg-mist rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-3 py-1.5 text-[13px] font-semibold text-white bg-accent-berry rounded-md hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-[13px] font-semibold text-accent-berry hover:underline"
            >
              Delete chore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
