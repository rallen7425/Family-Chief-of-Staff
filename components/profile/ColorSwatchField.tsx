"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { ACCENT_HEX, ACCENT_NAME } from "@/lib/colors";
import type { AccentColor } from "@/lib/types";

export function ColorSwatchField({
  label = "Color",
  value,
  colors,
  conflictWith,
  onSave,
}: {
  label?: string;
  value: AccentColor;
  colors: AccentColor[];
  /** Returns true when picking `c` would collide with another member. */
  conflictWith?: (c: AccentColor) => boolean;
  onSave: (c: AccentColor) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AccentColor>(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await onSave(draft);
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  const draftConflicts = conflictWith?.(draft) ?? false;

  return (
    <div>
      <span className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block">
        {label}
      </span>
      {editing ? (
        <>
          <div className="grid grid-cols-6 gap-2 mb-2.5">
            {colors.map((c) => {
              const selected = draft === c;
              const dim = !selected && (conflictWith?.(c) ?? false);
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={ACCENT_NAME[c]}
                  onClick={() => setDraft(c)}
                  className="aspect-square rounded-full flex items-center justify-center"
                  style={{
                    background: ACCENT_HEX[c],
                    border: selected ? "2px solid #23262B" : "2px solid transparent",
                    opacity: dim ? 0.45 : 1,
                  }}
                >
                  {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          {draftConflicts && (
            <p className="text-[12px] text-accent-berry mb-2.5">
              Another family member already uses {ACCENT_NAME[draft]} — pick another so schedule
              bars stay easy to tell apart.
            </p>
          )}
          {error && <p className="text-[12px] text-accent-berry mb-2.5">{error}</p>}
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
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
              disabled={isPending}
              className="flex-1 py-2 rounded-input border border-border text-muted-text text-[13px] font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex items-center gap-2.5">
            <span
              className="w-6 h-6 rounded-full inline-block"
              style={{ background: ACCENT_HEX[value] }}
            />
            <span className="text-[15px] text-ink font-medium">{ACCENT_NAME[value]}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setError(null);
              setEditing(true);
            }}
            aria-label="Edit color"
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-muted-label hover:text-primary shrink-0"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
