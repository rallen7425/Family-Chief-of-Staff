"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { updateHomeAddress } from "@/lib/actions/locations";

export function HomeLocationCard({ address }: { address: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await updateHomeAddress(draft);
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
      <span className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block">
        Home location
      </span>
      {editing ? (
        <>
          <input
            autoFocus
            className="w-full bg-mist border border-primary rounded-input px-3.5 py-2.5 text-[15px] text-ink mb-2"
            value={draft}
            placeholder="Street address"
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <p className="text-[12px] text-accent-berry mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="flex-1 py-2 rounded-input bg-primary text-white text-[13px] font-semibold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="flex-1 py-2 rounded-input border border-border text-muted-text text-[13px] font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex items-center gap-2.5 min-w-0">
            <Home size={17} className="text-muted-label shrink-0" />
            <span className={`text-[14.5px] ${address ? "text-ink font-medium" : "text-muted-label"}`}>
              {address || "Add a home address"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(address ?? "");
              setError(null);
              setEditing(true);
            }}
            className="text-[13px] font-semibold text-primary shrink-0"
          >
            Edit
          </button>
        </div>
      )}
      <p className="text-[12px] text-muted-label mt-2">
        Used as the default starting point for travel-time buffers when there&rsquo;s no earlier event
        that day.
      </p>
    </div>
  );
}
