"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Info } from "lucide-react";
import { EventRow } from "@/components/events/EventRow";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface AdvisorySummaryProps {
  advisories: CalendarEvent[];
  familyMembers: FamilyMember[];
}

/**
 * Advisories (road closures, weather notes, "allow extra travel time") share
 * the day's list with real events but are collapsed into one summary line so
 * they don't crowd out things the family actually has to be somewhere for.
 * Muted throughout, no person color. Each row still opens the details modal
 * (edit / delete) — advisory cleanup is a real need.
 */
export function AdvisorySummary({ advisories, familyMembers }: AdvisorySummaryProps) {
  const [open, setOpen] = useState(false);
  if (advisories.length === 0) return null;

  return (
    <div className="mb-4 rounded-input border border-border bg-mist/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <Info size={15} className="text-muted-label shrink-0" />
        <span className="text-[13px] font-semibold text-muted-text flex-1">
          {advisories.length} advisor{advisories.length === 1 ? "y" : "ies"}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-label transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          {advisories.map((advisory) => (
            <EventRow key={advisory.id} event={advisory} familyMembers={familyMembers}>
              <div className="flex gap-3 items-start">
                <div className="w-14 text-[12px] text-muted-label pt-0.5 shrink-0 text-right">
                  {advisory.allDay ? "All day" : format(new Date(advisory.startsAt), "h:mma").toLowerCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-muted-text leading-tight">{advisory.title}</p>
                  {advisory.location && (
                    <p className="text-[12px] text-muted-label mt-0.5">{advisory.location}</p>
                  )}
                </div>
              </div>
            </EventRow>
          ))}
        </div>
      )}
    </div>
  );
}
