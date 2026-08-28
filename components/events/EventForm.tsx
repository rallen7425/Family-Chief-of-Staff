"use client";

import { useState, useTransition } from "react";
import type { FamilyMember } from "@/lib/types";
import type { EventInput } from "@/lib/events/recurrence";
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from "@/components/shared/formStyles";

export interface EventFormInitialValues {
  title: string;
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
        familyMemberId: familyMemberId || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        allDay: !time,
        location,
        notes,
        recurrence: repeatsWeekly
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
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="event-title">
          Title
        </label>
        <input
          id="event-title"
          className={FORM_INPUT_CLASS}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Soccer practice"
        />
      </div>
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-date">
            Date
          </label>
          <input
            id="event-date"
            type="date"
            className={FORM_INPUT_CLASS}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-time">
            Time (optional)
          </label>
          <input
            id="event-time"
            type="time"
            className={FORM_INPUT_CLASS}
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (!e.target.value) setEndTime("");
            }}
          />
        </div>
      </div>
      {time && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-end-time">
            End time (optional)
          </label>
          <input
            id="event-end-time"
            type="time"
            className={FORM_INPUT_CLASS}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
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
      {!isEditing && (
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
      {!isEditing && repeatsWeekly && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="event-repeat-until">
            Until
          </label>
          <input
            id="event-repeat-until"
            type="date"
            className={FORM_INPUT_CLASS}
            value={repeatUntil}
            onChange={(e) => setRepeatUntil(e.target.value)}
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
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
