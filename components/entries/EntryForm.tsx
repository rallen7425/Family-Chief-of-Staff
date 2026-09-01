"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import type { ArrivalSource, EntryInput, EntryKind, FamilyMember } from "@/lib/types";
import { matchArrivalRule, describeArrivalRule, type ArrivalBufferRule } from "@/lib/arrival";
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from "@/components/shared/formStyles";
import { DatePickerButton } from "@/components/shared/DatePickerButton";
import { TimePickerButton } from "@/components/shared/TimePickerButton";
import { MultiOwnerPicker } from "@/components/entries/MultiOwnerPicker";

export interface LinkableEntry {
  id: string;
  title: string;
  when: string;
}

export interface EntryFormInitialValues {
  kind: EntryKind;
  title: string;
  subjectMemberId: string;
  ownerMemberIds: string[];
  category: string;
  date: string;
  endDate: string;
  time: string;
  endTime: string;
  arrivalTime: string;
  arrivalSource: ArrivalSource | "";
  busyStatus: "busy" | "free";
  isCritical: boolean;
  location: string;
  notes: string;
  linkedEntryId: string;
  repeatsWeekly: boolean;
  repeatUntil: string;
}

const CATEGORIES = ["game", "practice", "rehearsal", "appointment", "other"] as const;
const KIND_LABEL: Record<EntryKind, string> = {
  event: "Event",
  task: "Task",
  reminder: "Reminder",
  advisory: "Advisory",
};

interface EntryFormProps {
  familyMembers: FamilyMember[];
  arrivalRules: ArrivalBufferRule[];
  linkables?: LinkableEntry[];
  initialValues?: Partial<EntryFormInitialValues>;
  /** create = full form incl. Kind selector + Repeats; edit = kind/roles
   * locked, no Repeats. */
  mode: "create" | "edit";
  /** create mode only: hide the Type segmented control (e.g. a chat draft
   * that already committed to a kind) while keeping everything else editable. */
  kindLocked?: boolean;
  submitLabel?: string;
  onSubmit: (input: EntryInput) => Promise<{ error?: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

function defaults(v?: Partial<EntryFormInitialValues>): EntryFormInitialValues {
  return {
    kind: v?.kind ?? "event",
    title: v?.title ?? "",
    subjectMemberId: v?.subjectMemberId ?? "",
    ownerMemberIds: v?.ownerMemberIds ?? [],
    category: v?.category ?? "",
    date: v?.date ?? "",
    endDate: v?.endDate ?? "",
    time: v?.time ?? "",
    endTime: v?.endTime ?? "",
    arrivalTime: v?.arrivalTime ?? "",
    arrivalSource: v?.arrivalSource ?? "",
    busyStatus: v?.busyStatus ?? "busy",
    isCritical: v?.isCritical ?? false,
    location: v?.location ?? "",
    notes: v?.notes ?? "",
    linkedEntryId: v?.linkedEntryId ?? "",
    repeatsWeekly: v?.repeatsWeekly ?? false,
    repeatUntil: v?.repeatUntil ?? "",
  };
}

export function EntryForm({
  familyMembers,
  arrivalRules,
  linkables = [],
  initialValues,
  mode,
  kindLocked = false,
  submitLabel,
  onSubmit,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const init = defaults(initialValues);
  const [kind, setKind] = useState<EntryKind>(init.kind);
  const [title, setTitle] = useState(init.title);
  const [subjectMemberId, setSubjectMemberId] = useState(init.subjectMemberId);
  const [ownerMemberIds, setOwnerMemberIds] = useState<string[]>(init.ownerMemberIds);
  const [category, setCategory] = useState(init.category);
  const [date, setDate] = useState(init.date);
  const [endDate, setEndDate] = useState(init.endDate);
  const [time, setTime] = useState(init.time);
  const [endTime, setEndTime] = useState(init.endTime);
  const [arrivalTime, setArrivalTime] = useState(init.arrivalTime);
  const [arrivalSource, setArrivalSource] = useState<ArrivalSource | "">(init.arrivalSource);
  const [busyStatus, setBusyStatus] = useState<"busy" | "free">(init.busyStatus);
  const [isCritical, setIsCritical] = useState(init.isCritical);
  const [location, setLocation] = useState(init.location);
  const [notes, setNotes] = useState(init.notes);
  const [linkedEntryId, setLinkedEntryId] = useState(init.linkedEntryId);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [repeatsWeekly, setRepeatsWeekly] = useState(init.repeatsWeekly);
  const [repeatUntil, setRepeatUntil] = useState(init.repeatUntil);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCreate = mode === "create";
  const isAdvisory = kind === "advisory";
  const isTask = kind === "task";
  const isEvent = kind === "event";
  const isReminder = kind === "reminder";

  const subject = familyMembers.find((m) => m.id === subjectMemberId);
  const subjectIsAdult = subject?.isAdult ?? false;
  const showSubject = !isAdvisory;
  const showOwner = isEvent || isTask;
  const showCategory = isEvent || isReminder;
  const showLocation = !isTask;

  // Auto arrival: kid-subject event, no manual override, category + start known.
  const autoArrival = useMemo(() => {
    if (!isEvent || arrivalSource === "manual" || !date || !time) return null;
    const rule = matchArrivalRule(
      { kind: "event", startsAt: `${date}T${time}`, category: category || undefined, subjectMemberId: subjectMemberId || null, subjectIsAdult },
      arrivalRules
    );
    if (!rule) return null;
    const start = new Date(`${date}T${time}`);
    const at = new Date(start.getTime() - rule.bufferMinutes * 60_000);
    return { rule, label: format(at, "h:mm a"), hhmm: format(at, "HH:mm") };
  }, [isEvent, arrivalSource, date, time, category, subjectMemberId, subjectIsAdult, arrivalRules]);

  const effectiveArrivalTime = arrivalSource === "manual" ? arrivalTime : autoArrival?.hhmm ?? arrivalTime;
  const arrivalBadge =
    arrivalSource === "manual"
      ? { text: "Set manually", tone: "blue" as const }
      : arrivalSource === "stated"
        ? { text: `From email · report by ${arrivalTime}`, tone: "purple" as const }
        : autoArrival
          ? { text: describeArrivalRule(autoArrival.rule), tone: "purple" as const }
          : null;

  function selectKind(k: EntryKind) {
    setKind(k);
    if (k === "advisory") {
      setSubjectMemberId("");
      setOwnerMemberIds([]);
    }
    if (k !== "event" && k !== "task") setOwnerMemberIds([]);
  }

  function selectSubject(id: string) {
    setSubjectMemberId(id);
    const m = familyMembers.find((x) => x.id === id);
    // Adult subject → personal entry, no separate owner (§6b). Kid / whole
    // family → leave Owner as the user last set it.
    if (m?.isAdult) setOwnerMemberIds([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if ((isEvent || isAdvisory || isReminder) && !date) return setError("Date is required.");
    if (isTask && !date) return setError("A due date is required.");
    if (isEvent && repeatsWeekly && !repeatUntil) return setError("Pick an end date for the repeat.");

    const startsAt =
      isEvent || isAdvisory || isReminder
        ? (time ? new Date(`${date}T${time}`) : new Date(`${date}T00:00`)).toISOString()
        : null;
    const endsAt = isEvent && time && endTime ? new Date(`${date}T${endTime}`).toISOString() : isAdvisory && endDate ? new Date(`${endDate}T00:00`).toISOString() : null;

    let arrivalAt: string | null = null;
    let resolvedArrivalSource: ArrivalSource | null = null;
    if (isEvent) {
      if (arrivalSource === "manual" && arrivalTime) {
        arrivalAt = new Date(`${date}T${arrivalTime}`).toISOString();
        resolvedArrivalSource = "manual";
      } else if (arrivalSource === "stated" && arrivalTime) {
        arrivalAt = new Date(`${date}T${arrivalTime}`).toISOString();
        resolvedArrivalSource = "stated";
      } else if (autoArrival) {
        arrivalAt = new Date(new Date(`${date}T${time}`).getTime() - autoArrival.rule.bufferMinutes * 60_000).toISOString();
        resolvedArrivalSource = "inferred";
      }
    }

    const input: EntryInput = {
      kind,
      title: title.trim(),
      subjectMemberId: isAdvisory ? null : subjectMemberId || null,
      ownerMemberIds: showOwner ? ownerMemberIds : [],
      scope: subjectIsAdult && !isAdvisory ? "personal" : "family",
      busyStatus: isEvent ? busyStatus : "free",
      isCritical,
      category: showCategory ? category || null : null,
      notes: notes.trim() || null,
      location: showLocation ? location.trim() || null : null,
      startsAt,
      endsAt,
      dueAt: isTask ? date || null : null,
      allDay: (isEvent || isReminder) && !time,
      arrivalAt,
      arrivalSource: resolvedArrivalSource,
      linkedEntryId: isReminder ? linkedEntryId || null : null,
      recurrence:
        isEvent && repeatsWeekly
          ? {
              localDate: date,
              localStartTime: time || undefined,
              localEndTime: time && endTime ? endTime : undefined,
              untilDate: repeatUntil,
            }
          : null,
    };

    startTransition(async () => {
      const result = await onSubmit(input);
      if (result.error) return setError(result.error);
      onSuccess();
    });
  }

  const effectiveSubmitLabel = submitLabel ?? (isCreate ? `Add ${KIND_LABEL[kind]}` : "Save");
  const dateLabel = isTask ? "Due date" : isAdvisory ? "Starts" : "Date";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isCreate && !kindLocked && (
        <div>
          <label className={FORM_LABEL_CLASS}>Type</label>
          <div className="flex gap-1.5">
            {(Object.keys(KIND_LABEL) as EntryKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => selectKind(k)}
                className={`flex-1 py-2 rounded-pill text-[13px] font-semibold transition-colors ${
                  kind === k ? "bg-primary text-white" : "bg-mist text-muted-text border border-border hover:bg-border/40"
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      )}
      {(!isCreate || kindLocked) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-mist text-muted-text border border-border">
            {KIND_LABEL[kind]}
          </span>
          {!isCreate && (
            <span className="text-[12px] text-muted-label">Type can&rsquo;t be changed after creation</span>
          )}
        </div>
      )}

      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="entry-title">
          Title
        </label>
        <input
          id="entry-title"
          className={FORM_INPUT_CLASS}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isAdvisory ? "e.g. Main St lane closure" : isTask ? "e.g. Sign field trip form" : "e.g. Soccer practice"}
        />
      </div>

      {isReminder && (
        <div>
          <label className={FORM_LABEL_CLASS}>About (optional)</label>
          {(() => {
            const linked = linkables.find((l) => l.id === linkedEntryId);
            if (linkedEntryId && !aboutOpen) {
              return (
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-[14px] text-ink rounded-input border border-border bg-mist/50 px-3 py-2">
                    {linked ? `${linked.title} · ${linked.when}` : "Linked entry"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAboutOpen(true)}
                    className="shrink-0 text-[13px] font-semibold text-primary hover:underline"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkedEntryId("")}
                    className="shrink-0 text-[13px] font-semibold text-muted-text hover:underline"
                  >
                    Unlink
                  </button>
                </div>
              );
            }
            if (!aboutOpen) {
              return (
                <button
                  type="button"
                  onClick={() => setAboutOpen(true)}
                  className="w-full text-left text-[14px] text-muted-text rounded-input border border-dashed border-border px-3 py-2 hover:bg-mist transition-colors"
                >
                  + Link to an event or task
                </button>
              );
            }
            return (
              <div className="rounded-input border border-border divide-y divide-border max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setLinkedEntryId("");
                    setAboutOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-mist ${
                    linkedEntryId === "" ? "text-primary font-semibold" : "text-muted-text"
                  }`}
                >
                  Standalone (no link)
                </button>
                {linkables.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLinkedEntryId(l.id);
                      setAboutOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-mist ${
                      linkedEntryId === l.id ? "text-primary font-semibold" : "text-muted-text"
                    }`}
                  >
                    {l.title} <span className="opacity-70">· {l.when}</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {(showSubject || showOwner) && (
        <div className="grid grid-cols-2 gap-3">
          {showSubject && (
            <div>
              <label className={FORM_LABEL_CLASS} htmlFor="entry-subject">
                {isTask ? "For" : "Subject"}
              </label>
              {isCreate ? (
                <select
                  id="entry-subject"
                  className={FORM_INPUT_CLASS}
                  value={subjectMemberId}
                  onChange={(e) => selectSubject(e.target.value)}
                >
                  <option value="">Whole family</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[15px] text-ink py-2.5">{subject ? subject.name : "Whole family"}</p>
              )}
            </div>
          )}
          {showOwner && (
            <div>
              <label className={FORM_LABEL_CLASS}>Owner</label>
              {isCreate ? (
                <MultiOwnerPicker
                  familyMembers={familyMembers}
                  selectedIds={ownerMemberIds}
                  onChange={setOwnerMemberIds}
                  disabled={subjectIsAdult}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 py-1.5">
                  {ownerMemberIds.length === 0 ? (
                    <span className="text-[14px] text-muted-label">None</span>
                  ) : (
                    ownerMemberIds.map((id) => (
                      <span key={id} className="text-[12px] font-semibold px-2 py-1 rounded bg-mist text-muted-text border border-border">
                        {familyMembers.find((m) => m.id === id)?.name ?? "?"}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {isCreate && showOwner && subjectIsAdult && (
        <p className="-mt-2 text-[12px] text-muted-label">Personal entry — no separate owner needed.</p>
      )}

      {showCategory && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="entry-category">
            Category
          </label>
          {isCreate ? (
            <select id="entry-category" className={FORM_INPUT_CLASS} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[15px] text-ink py-2.5 capitalize">{category || "None"}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FORM_LABEL_CLASS}>{dateLabel}</label>
          <DatePickerButton value={date} onChange={setDate} />
        </div>
        {isAdvisory ? (
          <div>
            <label className={FORM_LABEL_CLASS}>Ends (optional)</label>
            <DatePickerButton value={endDate} onChange={setEndDate} min={date || undefined} />
          </div>
        ) : isTask ? null : (
          <div>
            <label className={FORM_LABEL_CLASS}>Time</label>
            <TimePickerButton
              value={time}
              placeholder="All day"
              onChange={(v) => {
                setTime(v);
                if (!v) setEndTime("");
              }}
            />
          </div>
        )}
      </div>

      {isEvent && time && (
        <div>
          <label className={FORM_LABEL_CLASS}>End time (optional)</label>
          <TimePickerButton value={endTime} onChange={setEndTime} placeholder="Optional" />
        </div>
      )}

      {isEvent && (
        <div>
          <label className={FORM_LABEL_CLASS}>Arrival time</label>
          <TimePickerButton
            value={effectiveArrivalTime}
            placeholder="Not set"
            onChange={(v) => {
              setArrivalTime(v);
              setArrivalSource(v ? "manual" : "");
            }}
          />
          {arrivalBadge ? (
            <span
              className={`inline-block mt-1.5 text-[12px] font-medium px-2 py-0.5 rounded ${
                arrivalBadge.tone === "blue" ? "bg-[#EEF2FB] text-[#3B6FE5]" : "bg-[#F3EEF9] text-[#7C5CBF]"
              }`}
            >
              {arrivalBadge.text}
            </span>
          ) : (
            <p className="mt-1.5 text-[12px] text-muted-label border border-dashed border-border rounded px-2 py-1 inline-block">
              Not set — no default{category ? ` for ${category}s` : ""}.
            </p>
          )}
        </div>
      )}

      {isEvent && (
        <div>
          <label className={FORM_LABEL_CLASS}>Time block</label>
          <div className="flex gap-1.5">
            {(["busy", "free"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBusyStatus(b)}
                className={`flex-1 py-2 rounded-pill text-[13px] font-semibold capitalize transition-colors ${
                  busyStatus === b ? "bg-primary text-white" : "bg-mist text-muted-text border border-border hover:bg-border/40"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[12px] text-muted-label">Only busy entries are checked for scheduling conflicts.</p>
        </div>
      )}

      <div>
        <label className={FORM_LABEL_CLASS}>Priority</label>
        <button
          type="button"
          onClick={() => setIsCritical((v) => !v)}
          aria-pressed={isCritical}
          className={`w-full py-2 rounded-pill text-[13px] font-semibold transition-colors ${
            isCritical
              ? "bg-accent-berry text-white"
              : "bg-mist text-muted-text border border-border hover:bg-border/40"
          }`}
        >
          {isCritical ? "Critical" : "Mark as critical"}
        </button>
        <p className="mt-1 text-[12px] text-muted-label">
          Critical entries surface above other notifications on the Today screen.
        </p>
      </div>

      {showLocation && (
        <div>
          <label className={FORM_LABEL_CLASS} htmlFor="entry-location">
            Location
          </label>
          <input
            id="entry-location"
            className={FORM_INPUT_CLASS}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional — used for travel-time buffers"
          />
        </div>
      )}

      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="entry-notes">
          Additional details
        </label>
        <textarea
          id="entry-notes"
          className={`${FORM_INPUT_CLASS} min-h-[70px] resize-none`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {isCreate && isEvent && (
        <div>
          <label className={FORM_LABEL_CLASS}>Repeats</label>
          <div className="flex gap-1.5">
            {[
              { v: false, label: "Does not repeat" },
              { v: true, label: "Weekly" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setRepeatsWeekly(opt.v)}
                className={`flex-1 py-2 rounded-pill text-[13px] font-semibold transition-colors ${
                  repeatsWeekly === opt.v ? "bg-primary text-white" : "bg-mist text-muted-text border border-border hover:bg-border/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {isCreate && isEvent && repeatsWeekly && (
        <div>
          <label className={FORM_LABEL_CLASS}>Until</label>
          <DatePickerButton value={repeatUntil} onChange={setRepeatUntil} min={date || undefined} />
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
          {isPending ? "Saving…" : effectiveSubmitLabel}
        </button>
      </div>
    </form>
  );
}
