"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerButtonProps {
  /** YYYY-MM-DD, or "" for no selection. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** Earliest selectable date, YYYY-MM-DD. Days before it are disabled. */
  min?: string;
  placeholder?: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Replaces `<input type="date">`, which silently mangles typed input on some
 * browsers/locales (e.g. "08/26/2026" -> "mm/08/262026"). Selection is
 * click-only on a month grid, so a malformed value is unrepresentable.
 */
export function DatePickerButton({ value, onChange, id, min, placeholder = "Pick a date" }: DatePickerButtonProps) {
  const selected = parseYmd(value);
  const minDate = min ? parseYmd(min) : null;

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) setViewMonth(selected ?? new Date());
  }

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

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  function isDisabled(day: Date): boolean {
    return minDate ? isBefore(startOfDay(day), startOfDay(minDate)) : false;
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
      >
        <CalendarDays size={16} className="text-muted-label shrink-0" />
        <span className={selected ? "text-ink" : "text-muted-label"}>
          {selected ? format(selected, "EEE, MMM d, yyyy") : placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute z-50 mt-1 w-[280px] bg-surface border border-border rounded-input p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-semibold text-ink">{format(viewMonth, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-text hover:bg-mist transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-[11px] font-semibold text-muted-label text-center py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {gridDays.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSel = selected ? isSameDay(day, selected) : false;
              const isToday = isSameDay(day, new Date());
              const disabled = isDisabled(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(format(day, "yyyy-MM-dd"));
                    setOpen(false);
                  }}
                  className={[
                    "h-8 rounded-md text-[13px] flex items-center justify-center transition-colors",
                    disabled ? "text-border cursor-not-allowed" : "hover:bg-mist",
                    !inMonth && !disabled ? "text-muted-label" : "",
                    inMonth && !disabled && !isSel ? "text-ink" : "",
                    isSel ? "bg-primary text-white hover:bg-primary font-semibold" : "",
                    !isSel && isToday ? "font-semibold text-primary" : "",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
