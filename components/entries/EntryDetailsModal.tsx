"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { EntryForm, type EntryFormInitialValues, type LinkableEntry } from "@/components/entries/EntryForm";
import { updateEntry, deleteEntry, confirmEntry, dismissEntry, reclassifyEntry } from "@/lib/actions/entries";
import { describeVisibility } from "@/lib/visibility";
import { ACCENT_HEX } from "@/lib/colors";
import { ASSISTANT_NAME } from "@/lib/config";
import type { ArrivalBufferRule } from "@/lib/arrival";
import type { CalendarEvent, EntryKind, FamilyMember, SourceType } from "@/lib/types";

interface EntryDetailsModalProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  arrivalRules: ArrivalBufferRule[];
  linkables?: LinkableEntry[];
  open: boolean;
  onClose: () => void;
  startInEditMode?: boolean;
}

const KIND_LABEL: Record<string, string> = {
  event: "Event",
  task: "Task",
  reminder: "Reminder",
  advisory: "Advisory",
};

const SOURCE_LABEL: Record<SourceType, string> = {
  manual: "Manual entry",
  chat: `${ASSISTANT_NAME} chat`,
  email_scan: "Email scan",
  system: "System",
};

function toInitialValues(event: CalendarEvent): EntryFormInitialValues {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : undefined;
  const date = event.kind === "task" ? event.dueDate ?? "" : format(start, "yyyy-MM-dd");
  return {
    kind: event.kind,
    title: event.title,
    subjectMemberId: event.familyMemberId ?? "",
    ownerMemberIds: event.ownerMemberIds,
    category: event.category ?? "",
    date,
    endDate: event.kind === "advisory" && end ? format(end, "yyyy-MM-dd") : "",
    time: event.allDay ? "" : format(start, "HH:mm"),
    endTime: end && !event.allDay && event.kind === "event" ? format(end, "HH:mm") : "",
    arrivalTime: event.arrivalAt ? format(new Date(event.arrivalAt), "HH:mm") : "",
    arrivalSource: event.arrivalSource ?? "",
    busyStatus: event.busyStatus,
    isCritical: event.isCritical,
    location: event.location ?? "",
    notes: event.notes ?? "",
    linkedEntryId: event.linkedEntryId ?? "",
    repeatsWeekly: false,
    repeatUntil: "",
  };
}

function DeleteEntrySection({ event, onDeleted }: { event: CalendarEvent; onDeleted: () => void }) {
  const [state, setState] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEntry(event.id);
      if (result.error) return setError(result.error);
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

/** Approve / dismiss (and reclassify) an entry that's still awaiting review,
 * without going through the full Edit form. Auto-detected entries land as
 * `pending_review`; this is the one-tap accept/reject the schedule + Today
 * rows were missing. */
function PendingReviewActions({
  event,
  onResolved,
  compact = false,
}: {
  event: CalendarEvent;
  onResolved: () => void;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showKinds, setShowKinds] = useState(false);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      const result = (await fn()) as { error?: string } | void;
      if (result && result.error) return setError(result.error);
      onResolved();
    });
  }

  return (
    <div className="rounded-input bg-accent-gold/10 border border-accent-gold/30 p-3.5 flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold text-ink">
        Auto-detected — not on the schedule yet.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => run(() => confirmEntry(event.id))}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-input bg-primary text-white font-semibold text-[14px] hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          <Check size={15} /> Approve
        </button>
        <button
          type="button"
          onClick={() => run(() => dismissEntry(event.id))}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-input border border-border text-muted-text font-semibold text-[14px] hover:bg-mist transition-colors disabled:opacity-60"
        >
          <X size={15} /> Dismiss
        </button>
      </div>
      {!compact && (
        <div>
          <button
            type="button"
            onClick={() => setShowKinds((v) => !v)}
            className="text-[12px] font-semibold text-muted-text hover:text-primary transition-colors"
          >
            {showKinds ? "Keep as " : "Not the right type? Change from "}
            {KIND_LABEL[event.kind]}
            {showKinds ? "" : " →"}
          </button>
          {showKinds && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(KIND_LABEL) as EntryKind[])
                .filter((k) => k !== event.kind)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => run(() => reclassifyEntry(event.id, k))}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-pill text-[13px] border border-border text-muted-text hover:bg-mist transition-colors disabled:opacity-60"
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}
    </div>
  );
}

/** Mount only while `open` so `editing` re-initializes from
 * `startInEditMode` each time it's opened (see EventRow / ReviewList). */
export function EntryDetailsModal({
  event,
  familyMembers,
  arrivalRules,
  linkables = [],
  open,
  onClose,
  startInEditMode = false,
}: EntryDetailsModalProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(startInEditMode);
  const [deleted, setDeleted] = useState(false);

  const member = event.familyMemberId ? familyMembers.find((m) => m.id === event.familyMemberId) : undefined;
  const isAdvisory = event.kind === "advisory";
  const isPendingReview = event.status === "pending_review";

  function closeAfterDelete() {
    router.refresh();
    onClose();
  }

  function resolveReview() {
    router.refresh();
    onClose();
  }

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
      <Modal open={open} onClose={onClose} title={`Edit ${KIND_LABEL[event.kind].toLowerCase()}`}>
        <div className="flex flex-col gap-4">
          {isPendingReview && <PendingReviewActions event={event} onResolved={resolveReview} compact />}
          <EntryForm
            mode="edit"
            familyMembers={familyMembers}
            arrivalRules={arrivalRules}
            linkables={linkables}
            initialValues={toInitialValues(event)}
            onSubmit={(input) => updateEntry(event.id, input)}
            onSuccess={onClose}
            onCancel={() => setEditing(false)}
          />
          <div className="border-t border-border pt-3 flex flex-col">
            <DeleteEntrySection event={event} onDeleted={() => setDeleted(true)} />
          </div>
        </div>
      </Modal>
    );
  }

  const start = new Date(event.startsAt);
  const whenLabel =
    event.kind === "task"
      ? event.dueDate
        ? `Due ${format(new Date(`${event.dueDate}T00:00:00`), "EEEE, MMMM d, yyyy")}`
        : "No due date"
      : event.allDay
        ? format(start, "EEEE, MMMM d, yyyy") + " (all day)"
        : format(start, "EEEE, MMMM d, yyyy 'at' h:mm a");
  const rangeEnd = isAdvisory && event.endsAt ? new Date(event.endsAt) : undefined;
  const ownerNames = event.ownerMemberIds
    .map((id) => familyMembers.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];
  const arrival = event.arrivalAt ? new Date(event.arrivalAt) : undefined;

  return (
    <Modal open={open} onClose={onClose} title={event.title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${member ? "" : "bg-border"}`}
            style={member ? { background: ACCENT_HEX[member.accentColor] } : undefined}
          />
          <span className="text-[14px] text-muted-text">
            {isAdvisory ? "Household advisory" : member ? member.name : "Whole family"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-mist text-muted-label border border-border">
            {KIND_LABEL[event.kind]}
          </span>
          {event.status === "pending_review" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-gold/15 text-accent-gold">
              Pending review
            </span>
          )}
        </div>

        {isPendingReview && <PendingReviewActions event={event} onResolved={resolveReview} />}

        {ownerNames.length > 0 && (
          <p className="text-[13px] text-muted-label">
            Owner: <span className="text-ink font-medium">{ownerNames.join(", ")}</span>
          </p>
        )}

        <div>
          <p className="text-[15px] text-ink font-medium">
            {whenLabel}
            {rangeEnd && ` – ${format(rangeEnd, "EEEE, MMMM d, yyyy")}`}
          </p>
          {event.location && <p className="text-[14px] text-muted-label mt-0.5">{event.location}</p>}
          {arrival && (
            <span
              className={`inline-block mt-1.5 text-[12px] font-medium px-2 py-0.5 rounded ${
                event.arrivalSource === "manual" || event.arrivalSource === "stated"
                  ? "bg-[#EEF2FB] text-[#3B6FE5]"
                  : "bg-[#F3EEF9] text-[#7C5CBF]"
              }`}
            >
              Arrive {format(arrival, "h:mm a")}
              {event.arrivalSource === "inferred" ? " · auto" : event.arrivalSource === "stated" ? " · from email" : ""}
            </span>
          )}
        </div>

        {event.category && (
          <p className="text-[13px] text-muted-label">
            Category: <span className="text-ink font-medium capitalize">{event.category}</span>
          </p>
        )}

        {event.notes && (
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-label mb-1">Additional context</h3>
            <p className="text-[14px] text-ink whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}

        <p className="text-[13px] text-muted-label">
          Visible to: <span className="text-ink font-medium">{describeVisibility({ familyMemberId: event.familyMemberId }, familyMembers)}</span>
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
