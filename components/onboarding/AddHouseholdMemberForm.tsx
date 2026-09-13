"use client";

import { useState, useTransition } from "react";
import { addHouseholdMember } from "@/lib/actions/onboarding";

const INPUT_CLASS =
  "border border-border rounded-input px-3.5 py-3 text-[15px] font-body text-ink bg-mist placeholder:text-muted-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** Relationship is free text here, not the design canvas's chip picker —
 * matches the already-built /family/[memberId] pattern (profile-family-
 * management-plan.md's own decision: chips were rejected as unnecessary
 * UI weight for something set once and rarely touched). CLAUDE.md/the
 * real app is ground truth over the older mockup where they conflict. */
export function AddHouseholdMemberForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addHouseholdMember({ name, relationship, birthday });
      if (result?.error) return setError(result.error);
      onSuccess();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-muted-text">
          Name <span className="text-accent-berry">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emma"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-muted-text">Relationship</label>
        <input
          type="text"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="e.g. Daughter, Son, Spouse"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-muted-text">
          Birthdate <span className="text-accent-berry">*</span>
        </label>
        <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={INPUT_CLASS} />
        <p className="text-[11px] text-muted-label">Age is calculated automatically — no need to update it later.</p>
      </div>

      {error && <p className="text-[13px] font-medium text-accent-berry">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 rounded-input border border-border py-3 text-[14px] font-semibold text-muted-text transition-colors hover:bg-mist disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 rounded-input bg-primary py-3 text-[14px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add to household"}
        </button>
      </div>
    </div>
  );
}
