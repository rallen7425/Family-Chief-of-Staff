"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/lib/actions/events";
import type { FamilyMember } from "@/lib/types";

export function AddEventDialog({ familyMembers }: { familyMembers: FamilyMember[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add event"
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Event">
        <EventForm
          familyMembers={familyMembers}
          submitLabel="Add Event"
          onSubmit={createEvent}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
