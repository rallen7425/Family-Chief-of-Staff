"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { formatTimeLabel as toLabel, parseTimeInput } from "@/lib/timeInput";

interface TimePickerButtonProps {
  /** HH:mm (24h), or "" for no selection. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Minutes between options in the list. */
  stepMinutes?: number;
}

/** Replaces `<input type="time">` with a click-or-type list, matching the
 * date button's popover pattern. */
export function TimePickerButton({
  value,
  onChange,
  id,
  placeholder = "Pick a time",
  disabled = false,
  stepMinutes = 15,
}: TimePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const out: string[] = [];
    for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return out;
  }, [stepMinutes]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) setTyped("");
  }

  const typedMatch = typed ? parseTimeInput(typed) : null;
  const visibleOptions = typed
    ? options.filter((opt) => {
        const label = toLabel(opt).toLowerCase();
        const q = typed.trim().toLowerCase();
        return opt.startsWith(q) || label.includes(q) || (typedMatch !== null && opt === typedMatch);
      })
    : options;

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

  useEffect(() => {
    if (!open || !listRef.current) return;
    const target = value || "09:00";
    const el = listRef.current.querySelector<HTMLElement>(`[data-time="${target}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [open, value]);

  function commit(hhmm: string) {
    onChange(hhmm);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
      >
        <Clock size={16} className="text-muted-label shrink-0" />
        <span className={value ? "text-ink" : "text-muted-label"}>{value ? toLabel(value) : placeholder}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose time"
          className="absolute z-50 mt-1 w-[200px] bg-surface border border-border rounded-input shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
        >
          <input
            type="text"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (typedMatch) commit(typedMatch);
                else if (visibleOptions.length > 0) commit(visibleOptions[0]);
              }
            }}
            placeholder="Type e.g. 4:30 pm"
            className="w-full border-b border-border px-3 py-2 text-[14px] text-ink placeholder:text-muted-label focus:outline-none"
          />
          <div ref={listRef} className="max-h-[220px] overflow-y-auto py-1">
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-muted-label">No match</p>
            ) : (
              visibleOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  data-time={opt}
                  onClick={() => commit(opt)}
                  className={`w-full text-left px-3 py-1.5 text-[14px] transition-colors ${
                    opt === value ? "bg-primary text-white font-semibold" : "text-ink hover:bg-mist"
                  }`}
                >
                  {toLabel(opt)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
