"use client";

import { useState, useTransition } from "react";
import type { FamilyMember } from "@/lib/types";
import type { TodoInput } from "@/lib/actions/todos";
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from "@/components/shared/formStyles";
import { DatePickerButton } from "@/components/shared/DatePickerButton";

export interface TodoFormInitialValues {
  title: string;
  familyMemberId: string;
  dueDate: string; // YYYY-MM-DD
}

interface TodoFormProps {
  familyMembers: FamilyMember[];
  initialValues?: TodoFormInitialValues;
  submitLabel: string;
  onSubmit: (input: TodoInput) => Promise<{ error?: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TodoForm({
  familyMembers,
  initialValues,
  submitLabel,
  onSubmit,
  onSuccess,
  onCancel,
}: TodoFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [familyMemberId, setFamilyMemberId] = useState(initialValues?.familyMemberId ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    startTransition(async () => {
      const result = await onSubmit({
        title,
        familyMemberId: familyMemberId || null,
        dueDate: dueDate || undefined,
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
        <label className={FORM_LABEL_CLASS} htmlFor="todo-title">
          Title
        </label>
        <input
          id="todo-title"
          className={FORM_INPUT_CLASS}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sign field trip form"
        />
      </div>
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="todo-person">
          Person
        </label>
        <select
          id="todo-person"
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
      <div>
        <label className={FORM_LABEL_CLASS} htmlFor="todo-due">
          Due date
        </label>
        <DatePickerButton id="todo-due" value={dueDate} onChange={setDueDate} placeholder="Optional" />
      </div>
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
