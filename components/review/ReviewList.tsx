"use client";

import { useState, useTransition } from "react";
import { Check, X, CheckCheck, Pencil } from "lucide-react";
import { approveReviewItems, removeReviewItems, type ReviewItemRef } from "@/lib/actions/review";
import { EventDetailsModal } from "@/components/events/EventDetailsModal";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

export interface ReviewGroupItem {
  id: string;
  kind: "event" | "todo";
  title: string;
  when: string;
  location?: string;
  personName?: string;
  /** Full record, events only — lets the review row open EventDetailsModal
   * in edit mode without a separate fetch. */
  fullEvent?: CalendarEvent;
}

export interface ReviewGroup {
  key: string;
  subject: string;
  sender?: string;
  items: ReviewGroupItem[];
}

function itemKey(item: ReviewGroupItem): string {
  return `${item.kind}:${item.id}`;
}

function toRefs(items: ReviewGroupItem[]): ReviewItemRef[] {
  return items.map((item) => ({ id: item.id, kind: item.kind }));
}

export function ReviewList({ groups, familyMembers }: { groups: ReviewGroup[]; familyMembers: FamilyMember[] }) {
  const allKeys = groups.flatMap((group) => group.items.map(itemKey));
  // Default to everything selected — "approve all from this source" is the
  // primary flow; deselecting an item before approving is the exception.
  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys));
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<ReviewGroupItem | null>(null);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleApprove(refs: ReviewItemRef[]) {
    if (refs.length === 0) return;
    startTransition(() => approveReviewItems(refs));
  }

  function handleRemove(refs: ReviewItemRef[]) {
    if (refs.length === 0) return;
    startTransition(() => removeReviewItems(refs));
  }

  const totalItems = allKeys.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted-text">
          {totalItems} item{totalItems === 1 ? "" : "s"} across {groups.length} source
          {groups.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => handleApprove(groups.flatMap((group) => toRefs(group.items)))}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-pill bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 shrink-0"
        >
          <CheckCheck size={15} /> Approve All
        </button>
      </div>

      {groups.map((group) => {
        const checkedInGroup = group.items.filter((item) => selected.has(itemKey(item)));

        return (
          <section key={group.key} className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-[15px] text-ink leading-tight truncate">{group.subject}</h3>
                {group.sender && <p className="text-[12px] text-muted-label mt-0.5 truncate">{group.sender}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleApprove(toRefs(checkedInGroup))}
                disabled={isPending || checkedInGroup.length === 0}
                className="shrink-0 px-3 py-1.5 rounded-input border border-primary text-primary text-[12px] font-semibold hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:border-border disabled:text-muted-label"
              >
                Approve ({checkedInGroup.length})
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {group.items.map((item) => {
                const key = itemKey(item);
                const checked = selected.has(key);
                return (
                  <div key={key} className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={checked}
                      aria-label={checked ? "Deselect" : "Select"}
                      className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                            item.kind === "event" ? "bg-primary/10 text-primary" : "bg-accent-gold/15 text-accent-gold"
                          }`}
                        >
                          {item.kind}
                        </span>
                        {item.personName && <span className="text-[12px] text-muted-label">{item.personName}</span>}
                      </div>
                      <p className="text-[15px] font-medium text-ink leading-snug mt-0.5">{item.title}</p>
                      <p className="text-[13px] text-muted-label mt-0.5">
                        {item.when}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    {item.fullEvent && (
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        aria-label="Edit"
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-label hover:bg-mist hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove([{ id: item.id, kind: item.kind }])}
                      disabled={isPending}
                      aria-label="Remove"
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-label hover:bg-mist hover:text-accent-berry transition-colors disabled:opacity-40"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {editingItem?.fullEvent && (
        <EventDetailsModal
          key={editingItem.fullEvent.id}
          event={editingItem.fullEvent}
          familyMembers={familyMembers}
          open={true}
          onClose={() => setEditingItem(null)}
          startInEditMode
        />
      )}
    </div>
  );
}
