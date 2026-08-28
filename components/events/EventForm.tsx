"use client";

import { useState, useTransition } from "react";
import type { EntryKind, FamilyMember } from "@/lib/types";
import type { EventInput } from "@/lib/events/recurrence";
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from "@/components/shared/formStyles";
import { DatePickerButton } from "@/components/shared/DatePickerButton";
import { TimePickerButton } from "@/components/shared/TimePickerButton";

export interface EventFormInitialValues {
  title: string;
  kind?: EntryKind;
  familyMemberId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, or "" for all-day
  location: string;
  notes: string;
  endTime?: string; // HH:mm
  repeatsWeekly?: boolean;
  repeatUntil?: string; // YYYY-MM-DD
}

interface EventFormProps {
  familyMembers: FamilyMember[];
  initialValues?: EventFormInitialValues;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<{ error?: string }>;
  onSuccess: () => void;
  onCancel: () => void;
  /** Hides the "Repeats" recurrence controls — updateEvent doesn't support
   * turning an existing single event into a recurring series, so showing
   * them while editing lets the user "save" a setting that silently does
   * nothing. Only the create-new-event callers should leave this false. */
  isEditing?: boolean;
}

export function EventForm({
  familyMembers,
  initialValues,
  submitLabel,
  onSubmit,
  onSuccess,
  onCancel,
  isEditing = false,
}: EventFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [kind, setKind] = useState<EntryKind>(initialValues?.kind ?? "event");
  const [familyMemberId, setFamilyMemberId] = useState(initialValues?.familyMemberId ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [time, setTime] = useState(initialValues?.time ?? "");
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [repeatsWeekly, setRepeatsWeekly] = useState(initialValues?.repeatsWeekly ?? false);
  const [repeatUntil, setRepeatUntil] = useState(initialValues?.repeatUntil ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Kind is fixed once created (P0: no re-typing after creation). Advisories
  // are always whole-household, so the Person control is hidden for them.
  const isAdvisory = kind === "advisory";
  const showKindSelector = !isEditing;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (repeatsWeekly && !repeatUntil) {
      setError("Pick an end date for the repeat.");
      return;
    }

    // Computed in the browser so the user's actual local timezone resolves
    // the wall-clock time — a server (Vercel defaults to UTC) would
    // otherwise parse a naive "date+time" string in the wrong timezone.
    const startsAt = time ? new Date(`${date}T${time}`) : new Date(`${date}T00:00`);
    const endsAt = time && endTime ? new Date(`${date}T${endTime}`) : undefined;

    startTransition(async () => {
      const result = await onSubmit({
        title,
        kind,
        familyMemberId: isAdvisory ? null : familyMemberId || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        allDay: !time,
        location,
        notes,
        recurrence: repeatsWeekly && !isAdvisory
          ? {
              localDate: date,
              localStartTime: time || undefined,
              localEndTime: time && endTime ? endTime : undefined,
              untilDate: repeatUntil,
            }
          : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {showKindSelector && (
        <div>
          <label className={FORM_LABEL_CLASS}>Type</label>
          <div className="flex gap-2">
            {(["event", "advisory"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 py-2 rounded-pill text-[14px] font-semibold capitalize transition-colors ${
                  kind === k
                    ? "bg-primary text-white"
                    : "bg-mist text-muted-text border border-border hover:bg-border/40"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          {isAdvisory && (
            <p className="text-[12px] text-muted-label mt-1.5">
              A heads-up for the whole household (e.g. a road closure) — shown on the schedule but visually
              set apart from real events.
            </p>
          )}
        </div>
      )}
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="event-title">
          Title
        </label>
        <input
          id="event-title"
          className={FORM_INPUT_CLASS}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isAdvisory ? "e.g. Main St lane closure" : "e.g. Soccer practice"}
        />
      </div>
      {!isAdvisory && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-person">
            Person
          </label>
          <select
            id="event-person"
            className={FORM_INPUT_CLASS}
            value={familyMemberId}
            onChange={(e) => setFamilyMemberId(e.target.value)}
          >
            <option value="">Whole family</option>
            {familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-date">
            Date
          </label>
          <DatePickerButton id="event-date" value={date} onChange={setDate} />
        </div>
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-time">
            Time (optional)
          </label>
          <TimePickerButton
            id="event-time"
            value={time}
            placeholder="All day"
            onChange={(v) => {
              setTime(v);
              if (!v) setEndTime("");
            }}
          />
        </div>
      </div>
      {time && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-end-time">
            End time (optional)
          </label>
          <TimePickerButton id="event-end-time" value={endTime} onChange={setEndTime} placeholder="Optional" />
        </div>
      )}
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="event-location">
          Location
        </label>
        <input
          id="event-location"
          className={FORM_INPUT_CLASS}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="event-notes">
          Additional details
        </label>
        <textarea
          id="event-notes"
          className={`${FORM_INPUT_CLASS} min-h-[70px] resize-none`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>
      {!isEditing && !isAdvisory && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-repeats">
            Repeats
          </label>
          <select
            id="event-repeats"
            className={FORM_INPUT_CLASS}
            value={repeatsWeekly ? "weekly" : "none"}
            onChange={(e) => setRepeatsWeekly(e.target.value === "weekly")}
          >
            <option value="none">Does not repeat</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      )}
      {!isEditing && !isAdvisory && repeatsWeekly && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-repeat-until">
            Until
          </label>
          <DatePickerButton
            id="event-repeat-until"
            value={repeatUntil}
            onChange={setRepeatUntil}
            min={date || undefined}
          />
        </div>
      )}
      {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-input border border-border text-muted-text font-semibold text-[15px] hover:bg-mist transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 rounded-input bg-primary hover:bg-primary-hover text-white font-semibold text-[15px] transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : !isEditing && isAdvisory ? "Add Advisory" : submitLabel}
        </button>
      </div>
    </form>
  );
}
