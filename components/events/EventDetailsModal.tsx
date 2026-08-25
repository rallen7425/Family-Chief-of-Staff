"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { EventForm, type EventFormInitialValues } from "@/components/events/EventForm";
import { updateEvent } from "@/lib/actions/events";
import { describeVisibility } from "@/lib/visibility";
import { ACCENT_BG } from "@/lib/colors";
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
  chat: "Rufus chat",
  email_scan: "Email scan",
  system: "System",
};

/** Caller must remount this on each open (e.g. `key={open ? "open" : "closed"}`)
 * so `editing` re-initializes from `startInEditMode` every time — see EventRow
 * and ReviewList, the two places this is opened from. */
export function EventDetailsModal({
  event,
  familyMembers,
  open,
  onClose,
  startInEditMode = false,
}: EventDetailsModalProps) {
  const [editing, setEditing] = useState(startInEditMode);

  const member = event.familyMemberId
    ? familyMembers.find((m) => m.id === event.familyMemberId)
    : undefined;

  if (editing) {
    return (
      <Modal open={open} onClose={onClose} title="Edit event">
        <EventForm
          familyMembers={familyMembers}
          initialValues={toInitialValues(event)}
          submitLabel="Save"
          onSubmit={(input) => updateEvent(event.id, input)}
          onSuccess={onClose}
          onCancel={() => setEditing(false)}
        />
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
          <span className="text-[14px] text-muted-text">{member ? member.name : "Whole family"}</span>
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
