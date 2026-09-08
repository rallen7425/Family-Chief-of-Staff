"use client";

import { useState } from "react";
import { EntryDetailsModal } from "@/components/entries/EntryDetailsModal";
import { useEntryEditing } from "@/components/entries/EntryEditingContext";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

/** A Today-tile notification row backed by a real entry (advisory,
 * action-soon event, deadline task) — opens that entry's own
 * EntryDetailsModal on tap, same as everywhere else, instead of navigating
 * off to a generic Schedule/Todo list page. */
export function KeepInMindEntryRow({
  title,
  entry,
  dotClass,
  familyMembers,
}: {
  title: string;
  entry: CalendarEvent;
  dotClass: string;
  familyMembers: FamilyMember[];
}) {
  const [open, setOpen] = useState(false);
  const { arrivalRules, linkables, activitiesByMember } = useEntryEditing();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-[9px] py-[5px] text-left"
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{title}</span>
      </button>
      {open && (
        <EntryDetailsModal
          event={entry}
          familyMembers={familyMembers}
          arrivalRules={arrivalRules}
          linkables={linkables}
          activitiesByMember={activitiesByMember}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
