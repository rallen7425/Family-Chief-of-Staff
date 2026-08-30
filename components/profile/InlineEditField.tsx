"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

const LABEL_CLASS =
  "text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block";
const INPUT_CLASS =
  "w-full bg-mist border border-primary rounded-input px-3.5 py-2.5 text-[15px] text-ink";

export function InlineEditField({
  label,
  value,
  placeholder,
  emptyText,
  validate,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  /** Shown greyed in place of an empty value, e.g. "Add email address". */
  emptyText?: string;
  validate?: (v: string) => string | null;
  onSave: (v: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function open() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function save() {
    const local = validate?.(draft) ?? null;
    if (local) {
      setError(local);
      return;
    }
    setError(null);
    start(async () => {
      const res = await onSave(draft);
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div>
      <span className={LABEL_CLASS}>{label}</span>
      {editing ? (
        <>
          <input
            autoFocus
            className={`${INPUT_CLASS} mb-2`}
            value={draft}
            placeholder={placeholder}
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
          <span
            className={`text-[15px] ${value ? "text-ink font-medium" : "text-muted-label"}`}
          >
            {value || emptyText || "Not set"}
          </span>
          <button
            type="button"
            onClick={open}
            aria-label={`Edit ${label.toLowerCase()}`}
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-muted-label hover:text-primary shrink-0"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
