"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Clock, Pencil, EyeOff, X, Plus, Mic, Send } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import {
  addDetail,
  removeDetail,
  toggleDetailIgnored,
  updateDetail,
} from "@/lib/actions/memberDetails";
import type { FamilyMember, MemberDetail } from "@/lib/types";

export function MemberDetailsDialog({
  open,
  onClose,
  member,
  items,
}: {
  open: boolean;
  onClose: () => void;
  member: FamilyMember;
  /** Comes from the server page; `router.refresh()` after a mutation
   * re-supplies it. */
  items: MemberDetail[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`${member.name} — details`}>
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-muted-label leading-relaxed">
          Activities, teams, and anything else useful to know. Tap a row for more — coaches,
          addresses, schedules. Update, remove, or ignore any single piece.
        </p>

        {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

        {items.length === 0 ? (
          <p className="text-[13px] text-muted-label py-2">Nothing saved yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((it) => {
              const isEditing = editingId === it.id;
              const isExpanded = expanded.has(it.id);
              return (
                <div key={it.id} className="bg-mist rounded-[14px] overflow-hidden">
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        autoFocus
                        className="flex-1 min-w-0 m-2.5 bg-surface border border-primary rounded-lg px-2.5 py-1.5 text-[14px]"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            run(() => updateDetail(it.id, editDraft));
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpand(it.id)}
                        className="flex-1 min-w-0 text-left px-3.5 py-3"
                      >
                        <span
                          className={`block text-[14px] font-medium ${
                            it.ignored ? "line-through text-muted-label" : "text-ink"
                          }`}
                        >
                          {it.value}
                        </span>
                        {it.ignored && (
                          <span className="inline-block mt-1 text-[10.5px] font-bold text-muted-label bg-border/50 rounded-pill px-1.5">
                            Ignored — not used
                          </span>
                        )}
                        {!it.ignored && it.fields.length > 0 && (
                          <ChevronDown
                            size={13}
                            className={`inline-block ml-1 text-muted-label transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                    )}
                    <div className="flex items-center gap-0.5 pr-2 shrink-0">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            run(() => updateDetail(it.id, editDraft));
                            setEditingId(null);
                          }}
                          className="text-[12px] font-semibold text-primary px-2"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label="Edit"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(it.id);
                            setEditDraft(it.value);
                          }}
                          className="w-6 h-6 flex items-center justify-center text-muted-label hover:text-primary"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={it.ignored ? "Un-ignore" : "Ignore"}
                        disabled={isPending}
                        onClick={() => run(() => toggleDetailIgnored(it.id, !it.ignored))}
                        className={`w-6 h-6 flex items-center justify-center ${
                          it.ignored ? "text-primary" : "text-muted-label hover:text-ink"
                        }`}
                      >
                        <EyeOff size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        disabled={isPending}
                        onClick={() => run(() => removeDetail(it.id))}
                        className="w-6 h-6 flex items-center justify-center text-muted-label hover:text-accent-berry"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  {!isEditing && isExpanded && it.fields.length > 0 && (
                    <div className="px-3.5 pb-3 pt-1 border-t border-border/60 flex flex-col gap-1">
                      {it.fields.map((f, i) => (
                        <p key={i} className="text-[12.5px] leading-relaxed">
                          <span className="text-muted-label">{f.label}: </span>
                          <span className="text-ink font-medium">{f.value}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {adding ? (
          <div className="bg-mist rounded-[14px] p-3 flex flex-col gap-2">
            <input
              autoFocus
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[13px]"
              placeholder="Label — e.g. Activity, Team, Coach"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[13px]"
              placeholder="Value — e.g. Soccer — JV"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  run(() => addDetail({ familyMemberId: member.id, label: newLabel, value: newValue }));
                  setAdding(false);
                  setNewLabel("");
                  setNewValue("");
                }}
                className="flex-1 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold disabled:opacity-60"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="flex-1 py-1.5 rounded-lg border border-border text-muted-text text-[12px] font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-input border border-dashed border-border text-primary text-[13.5px] font-semibold"
          >
            <Plus size={15} strokeWidth={2.5} /> Add detail
          </button>
        )}

        <Link
          href="/settings/arrival"
          className="flex items-center justify-between gap-2 bg-mist border border-border rounded-[14px] px-3.5 py-3 mt-1"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-full bg-accent-gold/15 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-accent-gold" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink">Arrival buffer rules</span>
              <span className="block text-[11.5px] text-muted-label mt-0.5">
                Household-wide arrival offsets by activity type
              </span>
            </span>
          </span>
          <ChevronRight size={16} className="text-muted-label shrink-0" />
        </Link>

        {/* Freeform capture — visual only in this pass (Phase 3). */}
        <div className="mt-1">
          <div className="flex items-center gap-2 bg-mist border border-border rounded-pill pl-3.5 pr-1.5 py-1.5">
            <input
              disabled
              placeholder="Tell Rufus something new — “Ben made JV soccer, Coach Martinez”"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-ink placeholder:text-muted-label"
            />
            <span className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted-text shrink-0">
              <Mic size={14} />
            </span>
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
              <Send size={13} />
            </span>
          </div>
          <p className="text-[11px] text-muted-label mt-1.5 leading-relaxed">
            Coming later — type or speak naturally and Rufus proposes the details above for you to
            verify.
          </p>
        </div>
      </div>
    </Modal>
  );
}
