"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ACCENT_COLORS, ACCENT_HEX, ACCENT_NAME } from "@/lib/colors";
import type { AccentColor } from "@/lib/types";

/** Controlled colour picker for a form: collapsed swatch + name with an
 * "Edit color" affordance that expands the full 18-swatch grid. No own
 * Save — the value is part of the parent form's submit. */
export function ColorGrid({
  value,
  onChange,
  conflictWith,
}: {
  value: AccentColor;
  onChange: (c: AccentColor) => void;
  conflictWith?: (c: AccentColor) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const conflict = conflictWith?.(value) ?? false;

  if (!open) {
    return (
      <div>
        <span className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block">
          Color
        </span>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full inline-block" style={{ background: ACCENT_HEX[value] }} />
            <span className="text-[14.5px] text-ink font-medium">{ACCENT_NAME[value]}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[13px] font-semibold text-primary"
          >
            Edit color
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block">
        Color
      </span>
      <div className="grid grid-cols-6 gap-2 mb-2">
        {ACCENT_COLORS.map((c) => {
          const selected = value === c;
          const dim = !selected && (conflictWith?.(c) ?? false);
          return (
            <button
              key={c}
              type="button"
              aria-label={ACCENT_NAME[c]}
              onClick={() => onChange(c)}
              className="aspect-square rounded-full flex items-center justify-center"
              style={{
                background: ACCENT_HEX[c],
                border: selected ? "2px solid #23262B" : "2px solid transparent",
                opacity: dim ? 0.45 : 1,
              }}
            >
              {selected && <Check size={12} className="text-white" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {conflict && (
        <p className="text-[12px] text-accent-berry mb-1">
          Another family member already uses {ACCENT_NAME[value]} — pick another so schedule bars
          stay easy to tell apart.
        </p>
      )}
      <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-primary">
        Done
      </button>
    </div>
  );
}
