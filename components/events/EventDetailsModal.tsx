"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Trash2 } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { EventForm, type EventFormInitialValues } from "@/components/events/EventForm";
import { deleteEvent, updateEvent } from "@/lib/actions/events";
import { describeVisibility } from "@/lib/visibility";
import { ACCENT_BG } from "@/lib/colors";
import { ASSISTANT_NAME } from "@/lib/config";
import type { CalendarEvent, FamilyMember, SourceType } from "@/lib/types";

interface EventDetailsModalProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  open: boolean;
  onClose: () => void;
  /** Opens straight into edit mode (e.g. the review page's Edit action)
   * instead of the default view-first behavior. */
  startInEditMode?: boolean;
}

function toInitialValues(event: CalendarEvent): EventFormInitialValues {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : undefined;
  return {
    title: event.title,
    kind: event.kind,
    familyMemberId: event.familyMemberId ?? "",
    date: format(start, "yyyy-MM-dd"),
    time: event.allDay ? "" : format(start, "HH:mm"),
    endTime: end ? format(end, "HH:mm") : undefined,
    location: event.location ?? "",
    notes: event.notes ?? "",
  };
}

const SOURCE_LABEL: Record<SourceType, string> = {
  manual: "Manual entry",
  chat: `${ASSISTANT_NAME} chat`,
  email_scan: "Email scan",
  system: "System",
};

/** Callers must conditionally mount this only while `open` (rather than
 * always rendering it with `open` toggling), so `editing` re-initializes
 * fresh from `startInEditMode` each time it's opened — see EventRow and
 * ReviewList, the two places this is opened from. */
/** Delete affordance for edit mode: idle text-link -> inline confirm ->
 * end-state that replaces the whole modal body. Deliberately no native
 * confirm() dialog (blocks the event loop, feels foreign). */
function DeleteEntrySection({
  event,
  onDeleted,
}: {
  event: CalendarEvent;
  onDeleted: () => void;
}) {
  const [state, setState] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("confirming")}
        className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-accent-berry hover:underline self-start"
      >
        <Trash2 size={15} /> Delete entry
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-input bg-accent-berry/10 p-3.5">
      <p className="text-[14px] font-semibold text-ink">Delete this entry?</p>
      <p className="text-[13px] text-muted-text mt-0.5">This can&rsquo;t be undone.</p>
      {error && <p className="text-[13px] text-accent-berry font-medium mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setState("idle")}
          disabled={isPending}
          className="flex-1 py-2 rounded-input border border-border text-muted-text font-semibold text-[14px] hover:bg-mist transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 py-2 rounded-input bg-accent-berry text-white font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Confirm Delete"}
        </button>
      </div>
    </div>
  );
}

export function EventDetailsModal({
  event,
  familyMembers,
  open,
  onClose,
  startInEditMode = false,
}: EventDetailsModalProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(startInEditMode);
  const [deleted, setDeleted] = useState(false);

  function closeAfterDelete() {
    // deleteEvent skips its own revalidate so this confirmation can render;
    // refresh now that the user has seen it, to drop the row from the list.
    router.refresh();
    onClose();
  }

  const member = event.familyMemberId
    ? familyMembers.find((m) => m.id === event.familyMemberId)
    : undefined;

  if (deleted) {
    return (
      <Modal open={open} onClose={closeAfterDelete} title="Entry deleted">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-accent-berry/10 flex items-center justify-center">
            <Trash2 size={22} className="text-accent-berry" />
          </div>
          <p className="text-[16px] font-semibold text-ink">Entry deleted</p>
          <p className="text-[14px] text-muted-text">
            &ldquo;{event.title}&rdquo; has been removed from the schedule.
          </p>
          <button
            type="button"
            onClick={closeAfterDelete}
            className="mt-2 px-5 py-2.5 rounded-input bg-primary hover:bg-primary-hover text-white font-semibold text-[15px] transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  if (editing) {
    return (
      <Modal open={open} onClose={onClose} title={event.kind === "advisory" ? "Edit advisory" : "Edit event"}>
        <div className="flex flex-col gap-4">
          <EventForm
            familyMembers={familyMembers}
            initialValues={toInitialValues(event)}
            submitLabel="Save"
            onSubmit={(input) => updateEvent(event.id, input)}
            onSuccess={onClose}
            onCancel={() => setEditing(false)}
            isEditing
          />
          <div className="border-t border-border pt-3 flex flex-col">
            <DeleteEntrySection event={event} onDeleted={() => setDeleted(true)} />
          </div>
        </div>
      </Modal>
    );
  }

  const start = new Date(event.startsAt);
  const whenLabel = event.allDay
    ? format(start, "EEEE, MMMM d, yyyy") + " (all day)"
    : format(start, "EEEE, MMMM d, yyyy 'at' h:mm a");

  return (
    <Modal open={open} onClose={onClose} title={event.title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              member ? ACCENT_BG[member.accentColor] : "bg-border"
            }`}
          />
          <span className="text-[14px] text-muted-text">
            {event.kind === "advisory" ? "Household advisory" : member ? member.name : "Whole family"}
          </span>
          {event.kind === "advisory" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-mist text-muted-label border border-border">
              Advisory
            </span>
          )}
          {event.status === "pending_review" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-gold/15 text-accent-gold">
              Pending review
            </span>
          )}
        </div>

        <div>
          <p className="text-[15px] text-ink font-medium">{whenLabel}</p>
          {event.location && <p className="text-[14px] text-muted-label mt-0.5">{event.location}</p>}
        </div>

        {event.notes && (
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-label mb-1">
              Additional context
            </h3>
            <p className="text-[14px] text-ink whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}

        <p className="text-[13px] text-muted-label">
          Visible to: <span className="text-ink font-medium">{describeVisibility(event, familyMembers)}</span>
        </p>

        <details className="group border-t border-border pt-3">
          <summary className="flex items-center justify-between cursor-pointer list-none text-[13px] font-semibold text-muted-text">
            History
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
            <p>
              <span className="text-muted-label">Source: </span>
              <span className="text-ink">{SOURCE_LABEL[event.sourceType]}</span>
            </p>
            <p>
              <span className="text-muted-label">Added by: </span>
              <span className="text-ink">Household</span>
            </p>
            {event.sourceDetail?.googleAccountEmail && (
              <p>
                <span className="text-muted-label">Account: </span>
                <span className="text-ink">{event.sourceDetail.googleAccountEmail}</span>
              </p>
            )}
            <p>
              <span className="text-muted-label">Date added: </span>
              <span className="text-ink">{format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </p>
            {event.sourceType === "email_scan" && event.sourceDetail && (
              <>
                {event.sourceDetail.sender && (
                  <p>
                    <span className="text-muted-label">Sender: </span>
                    <span className="text-ink">{event.sourceDetail.sender}</span>
                  </p>
                )}
                {event.sourceDetail.receivedAt && (
                  <p>
                    <span className="text-muted-label">Received: </span>
                    <span className="text-ink">
                      {format(new Date(event.sourceDetail.receivedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </p>
                )}
                {event.sourceDetail.subject && (
                  <p>
                    <span className="text-muted-label">Subject: </span>
                    <span className="text-ink">{event.sourceDetail.subject}</span>
                  </p>
                )}
                {event.sourceDetail.attachmentName && (
                  <p>
                    <span className="text-muted-label">Attachment: </span>
                    <span className="text-ink">
                      {event.sourceDetail.attachmentName}
                      {event.sourceDetail.attachmentPage ? `, page ${event.sourceDetail.attachmentPage}` : ""}
                    </span>
                  </p>
                )}
                {event.sourceDetail.extractedSnippet && (
                  <p className="text-muted-text italic mt-1">&ldquo;{event.sourceDetail.extractedSnippet}&rdquo;</p>
                )}
              </>
            )}
            {event.sourceType === "chat" && event.sourceDetail?.message && (
              <p className="text-muted-text italic mt-1">&ldquo;{event.sourceDetail.message}&rdquo;</p>
            )}
          </div>
        </details>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 py-3 rounded-input border border-border text-ink font-semibold text-[15px] hover:bg-mist transition-colors"
        >
          Edit
        </button>
      </div>
    </Modal>
  );
}
