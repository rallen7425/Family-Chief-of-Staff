"use client";

import { useState } from "react";
import { EntryDetailsModal } from "@/components/entries/EntryDetailsModal";
import { useEntryEditing } from "@/components/entries/EntryEditingContext";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface EventRowProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  children: React.ReactNode;
}

/** Wraps an entry's visual row in a click target that opens
 * EntryDetailsModal — shared by DayGroup, ScheduleCard, AdvisorySummary.
 * Arrival rules / linkables come from EntryEditingProvider context. */
export function EventRow({ event, familyMembers, children }: EventRowProps) {
  const [open, setOpen] = useState(false);
  const { arrivalRules, linkables } = useEntryEditing();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left w-full">
        {children}
      </button>
      {open && (
        <EntryDetailsModal
          event={event}
          familyMembers={familyMembers}
          arrivalRules={arrivalRules}
          linkables={linkables}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
