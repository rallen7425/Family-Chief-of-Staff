"use client";

import { useState } from "react";
import { AlertCircle, Mail } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/shared/Modal";
import { EventForm } from "@/components/events/EventForm";
import { confirmEvent, dismissEvent, updateEvent } from "@/lib/actions/events";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface PendingReviewNudgeProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
}

export function PendingReviewNudge({ event, familyMembers }: PendingReviewNudgeProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"review" | "edit">("review");
  const [isPending, setIsPending] = useState(false);

  function close() {
    setOpen(false);
    setMode("review");
  }

  async function handleConfirm() {
    setIsPending(true);
    await confirmEvent(event.id);
    setIsPending(false);
    close();
  }

  async function handleDismiss() {
    setIsPending(true);
    await dismissEvent(event.id);
    setIsPending(false);
    close();
  }

  const startDate = new Date(event.startsAt);
  const detail = event.sourceDetail;

  return (
    <>
      <li>
        <button type="button" onClick={() => setOpen(true)} className="flex items-start gap-3 text-left w-full">
          <AlertCircle size={20} className="text-primary mt-[1px] shrink-0" />
          <span className="text-[15px] font-medium leading-relaxed text-ink">
            &ldquo;{event.title}&rdquo; was added from an email —{" "}
            <span className="text-primary font-semibold">needs your review</span>
          </span>
        </button>
      </li>
      <Modal open={open} onClose={close} title={mode === "edit" ? "Edit Event" : "Review Event"}>
        {mode === "review" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-[17px] text-ink mb-1">{event.title}</h3>
              <p className="text-[14px] text-muted-text">
                {event.allDay ? "All day" : format(startDate, "EEE, MMM d 'at' h:mma")}
              </p>
              {event.location && <p className="text-[14px] text-muted-label mt-0.5">{event.location}</p>}
            </div>
            {detail && (
              <div className="bg-mist rounded-input p-3.5 flex items-start gap-2.5">
                <Mail size={16} className="text-muted-text mt-0.5 shrink-0" />
                <div className="text-[13px] text-muted-text leading-relaxed">
                  {detail.sender && <p>From: {detail.sender}</p>}
                  {detail.subject && <p>Subject: {detail.subject}</p>}
                  {detail.attachmentName && <p>Attachment: {detail.attachmentName}</p>}
                  {detail.extractedSnippet && (
                    <p className="italic mt-1">&ldquo;{detail.extractedSnippet}&rdquo;</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full py-3 rounded-input bg-primary hover:bg-primary-hover text-white font-semibold text-[15px] transition-colors disabled:opacity-60"
              >
                {isPending ? "…" : "Looks good, add to calendar"}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-input border border-border text-ink font-semibold text-[15px] hover:bg-mist transition-colors disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-input border border-border text-muted-text font-semibold text-[15px] hover:bg-mist transition-colors disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EventForm
            familyMembers={familyMembers}
            initialValues={{
              title: event.title,
              familyMemberId: event.familyMemberId ?? "",
              date: format(startDate, "yyyy-MM-dd"),
              time: event.allDay ? "" : format(startDate, "HH:mm"),
              location: event.location ?? "",
              notes: event.notes ?? "",
            }}
            submitLabel="Save & Confirm"
            onSubmit={(input) => updateEvent(event.id, input)}
            onSuccess={close}
            onCancel={() => setMode("review")}
          />
        )}
      </Modal>
    </>
  );
}
