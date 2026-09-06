"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  EyeOff,
  X,
  Plus,
  Minus,
  Clock,
} from "lucide-react";
import {
  addDetail,
  removeDetail,
  setDetailActivity,
  toggleDetailIgnored,
  updateDetail,
} from "@/lib/actions/memberDetails";
import type { FamilyMember, MemberDetail } from "@/lib/types";

const ACTIVITY_CATEGORIES = ["game", "practice", "rehearsal", "appointment", "other"] as const;
const BUFFER_STEP = 5;
const BUFFER_MAX = 180;

/**
 * "Additional Context and Details" — the shared inline panel used on both My
 * Profile and the Manage Family member view, plus (with `defaultOpen`, no
 * "View all") its own full page. Collapsed by default like the event-history
 * disclosure; expands to a scrollable, editable list of activities / teams /
 * notes. Each row can carry a per-activity arrival buffer.
 */
export function AdditionalContextDetails({
  member,
  items,
  viewAllHref,
  defaultOpen = false,
}: {
  member: FamilyMember;
  items: MemberDetail[];
  /** Omit on the full page. */
  viewAllHref?: string;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
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

  const count = items.length;
  const previewCount = viewAllHref ? 4 : items.length;
  const shown = open ? items.slice(0, previewCount) : [];
  const hiddenCount = count - shown.length;

  return (
    <div className="bg-surface rounded-card shadow-sm shadow-black/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink">
            Additional Context and Details
          </span>
          <span className="block text-[12px] text-muted-label mt-0.5">
            {count === 0 ? "Activities, teams, coaches, notes" : `${count} saved`}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-label transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

          {count === 0 ? (
            <p className="text-[13px] text-muted-label">Nothing saved yet.</p>
          ) : (
            <div
              className={`flex flex-col gap-1.5 ${
                viewAllHref ? "max-h-[280px] overflow-y-auto pr-0.5" : ""
              }`}
            >
              {shown.map((it) => (
                <DetailRow
                  key={it.id}
                  item={it}
                  isEditing={editingId === it.id}
                  isExpanded={expanded.has(it.id)}
                  isPending={isPending}
                  editDraft={editDraft}
                  onEditDraft={setEditDraft}
                  onStartEdit={() => {
                    setEditingId(it.id);
                    setEditDraft(it.value);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={() => {
                    run(() => updateDetail(it.id, editDraft));
                    setEditingId(null);
                  }}
                  onToggleExpand={() => toggleExpand(it.id)}
                  onToggleIgnored={() => run(() => toggleDetailIgnored(it.id, !it.ignored))}
                  onRemove={() => run(() => removeDetail(it.id))}
                  onSaveActivity={(patch) => run(() => setDetailActivity(it.id, patch))}
                />
              ))}
            </div>
          )}

          {viewAllHref && hiddenCount > 0 && (
            <Link
              href={viewAllHref}
              className="text-[13px] font-semibold text-primary self-start inline-flex items-center gap-1"
            >
              View all ({hiddenCount} more)
              <ChevronRight size={14} />
            </Link>
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
              className="flex items-center justify-center gap-2 py-2.5 rounded-input border border-dashed border-border text-primary text-[13px] font-semibold"
            >
              <Plus size={15} strokeWidth={2.5} /> Add detail
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  item,
  isEditing,
  isExpanded,
  isPending,
  editDraft,
  onEditDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleExpand,
  onToggleIgnored,
  onRemove,
  onSaveActivity,
}: {
  item: MemberDetail;
  isEditing: boolean;
  isExpanded: boolean;
  isPending: boolean;
  editDraft: string;
  onEditDraft: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggleExpand: () => void;
  onToggleIgnored: () => void;
  onRemove: () => void;
  onSaveActivity: (patch: { category?: string | null; arrivalBufferMinutes?: number | null }) => void;
}) {
  const hasExtra = item.fields.length > 0 || !item.ignored;
  return (
    <div className="bg-mist rounded-[14px] overflow-hidden">
      <div className="flex items-center">
        {isEditing ? (
          <input
            autoFocus
            className="flex-1 min-w-0 m-2.5 bg-surface border border-primary rounded-lg px-2.5 py-1.5 text-[14px]"
            value={editDraft}
            onChange={(e) => onEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex-1 min-w-0 text-left px-3.5 py-3"
          >
            <span
              className={`block text-[14px] font-medium ${
                item.ignored ? "line-through text-muted-label" : "text-ink"
              }`}
            >
              {item.value}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              {item.label && (
                <span className="text-[11px] text-muted-label">{item.label}</span>
              )}
              {item.arrivalBufferMinutes != null && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent-gold bg-accent-gold/15 rounded-pill px-1.5">
                  <Clock size={10} /> {item.arrivalBufferMinutes}m early
                </span>
              )}
              {item.ignored && (
                <span className="text-[10.5px] font-bold text-muted-label bg-border/50 rounded-pill px-1.5">
                  Ignored
                </span>
              )}
            </span>
            {hasExtra && (
              <ChevronDown
                size={13}
                className={`inline-block ml-1 mt-1 text-muted-label transition-transform ${
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
              onClick={onSaveEdit}
              className="text-[12px] font-semibold text-primary px-2"
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              aria-label="Edit"
              disabled={isPending}
              onClick={onStartEdit}
              className="w-6 h-6 flex items-center justify-center text-muted-label hover:text-primary"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            type="button"
            aria-label={item.ignored ? "Un-ignore" : "Ignore"}
            disabled={isPending}
            onClick={onToggleIgnored}
            className={`w-6 h-6 flex items-center justify-center ${
              item.ignored ? "text-primary" : "text-muted-label hover:text-ink"
            }`}
          >
            <EyeOff size={13} />
          </button>
          <button
            type="button"
            aria-label="Remove"
            disabled={isPending}
            onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center text-muted-label hover:text-accent-berry"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!isEditing && isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-border/60 flex flex-col gap-2">
          {item.fields.map((f, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed">
              <span className="text-muted-label">{f.label}: </span>
              <span className="text-ink font-medium">{f.value}</span>
            </p>
          ))}
          <ActivityEditor item={item} isPending={isPending} onSave={onSaveActivity} />
        </div>
      )}
    </div>
  );
}

/** Per-activity category + arrival buffer — used by an entry bound to this
 * activity, overriding the household category rules. */
function ActivityEditor({
  item,
  isPending,
  onSave,
}: {
  item: MemberDetail;
  isPending: boolean;
  onSave: (patch: { category?: string | null; arrivalBufferMinutes?: number | null }) => void;
}) {
  const buffer = item.arrivalBufferMinutes;
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg bg-surface border border-border/70 p-2.5">
      <span className="text-[11px] font-semibold text-muted-text uppercase tracking-[0.03em]">
        Arrival for this activity
      </span>
      <div className="flex items-center gap-2">
        <select
          value={item.category ?? ""}
          disabled={isPending}
          onChange={(e) => onSave({ category: e.target.value || null })}
          className="text-[12.5px] text-ink bg-mist border border-border rounded-lg px-2 py-1"
        >
          <option value="">No category</option>
          {ACTIVITY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        {buffer == null ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onSave({ arrivalBufferMinutes: 15 })}
            className="text-[12px] font-semibold text-primary"
          >
            + Set arrival buffer
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Less"
              disabled={isPending || buffer <= 0}
              onClick={() => onSave({ arrivalBufferMinutes: Math.max(0, buffer - BUFFER_STEP) })}
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-text disabled:opacity-40"
            >
              <Minus size={12} />
            </button>
            <span className="text-[13px] font-semibold text-ink tabular-nums w-14 text-center">
              {buffer} min
            </span>
            <button
              type="button"
              aria-label="More"
              disabled={isPending || buffer >= BUFFER_MAX}
              onClick={() =>
                onSave({ arrivalBufferMinutes: Math.min(BUFFER_MAX, buffer + BUFFER_STEP) })
              }
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-text disabled:opacity-40"
            >
              <Plus size={12} />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSave({ arrivalBufferMinutes: null })}
              className="text-[11.5px] font-semibold text-muted-label hover:text-accent-berry ml-1"
            >
              Clear
            </button>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-label leading-relaxed">
        Used when an event is linked to this activity — overrides the household arrival defaults.
      </p>
    </div>
  );
}
