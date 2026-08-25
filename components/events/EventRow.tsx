"use client";

import { useState } from "react";
import { EventDetailsModal } from "@/components/events/EventDetailsModal";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface EventRowProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  children: React.ReactNode;
}

/** Wraps an event's existing visual row markup in a click target that opens
 * EventDetailsModal — shared by DayGroup (Day/3-Day/Week views) and
 * ScheduleCard (Today), so the modal/history logic lives in one place. */
export function EventRow({ event, familyMembers, children }: EventRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left w-full">
        {children}
      </button>
      <EventDetailsModal
        key={open ? "open" : "closed"}
        event={event}
        familyMembers={familyMembers}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
