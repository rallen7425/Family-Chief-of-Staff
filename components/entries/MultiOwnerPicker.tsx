"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember } from "@/lib/types";

interface MultiOwnerPickerProps {
  familyMembers: FamilyMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/** Compact multi-select in the visual slot the mockup's single Owner
 * dropdown occupied — a button showing the picked owners, opening a
 * checkable list popover (§6b / §8: Owner is multi, not single). */
export function MultiOwnerPicker({ familyMembers, selectedIds, onChange, disabled }: MultiOwnerPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = familyMembers.filter((m) => selectedIds.includes(m.id));
  const label = selected.length === 0 ? "None" : selected.map((m) => m.name).join(", ");

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
      >
        <span className={`flex-1 truncate ${selected.length ? "text-ink" : "text-muted-label"}`}>{label}</span>
        <ChevronDown size={16} className="text-muted-label shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-input shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1"
        >
          {familyMembers.map((member) => {
            const checked = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(member.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-ink hover:bg-mist transition-colors"
              >
                <span
                  className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    checked ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ACCENT_HEX[member.accentColor] }}
                />
                {member.name}
              </button>
            );
          })}
          <div className="border-t border-border mt-1 pt-1 px-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-1.5 text-[13px] font-semibold text-primary hover:bg-mist rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
