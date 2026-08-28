"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { EntryForm, type LinkableEntry } from "@/components/entries/EntryForm";
import { createEntry } from "@/lib/actions/entries";
import type { ArrivalBufferRule } from "@/lib/arrival";
import type { EntryKind, FamilyMember } from "@/lib/types";

interface AddEntryDialogProps {
  familyMembers: FamilyMember[];
  arrivalRules: ArrivalBufferRule[];
  linkables?: LinkableEntry[];
  defaultKind?: EntryKind;
  label?: string;
}

export function AddEntryDialog({
  familyMembers,
  arrivalRules,
  linkables = [],
  defaultKind = "event",
  label = "Add entry",
}: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Add Entry">
          <EntryForm
            mode="create"
            familyMembers={familyMembers}
            arrivalRules={arrivalRules}
            linkables={linkables}
            initialValues={{ kind: defaultKind }}
            onSubmit={(input) => createEntry(input)}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
