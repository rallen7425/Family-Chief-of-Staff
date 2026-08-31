"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { HeadOfHouseholdDialog } from "@/components/family/HeadOfHouseholdDialog";
import { EditMemberDialog } from "@/components/family/EditMemberDialog";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember, MemberDetail } from "@/lib/types";

export function ManageFamilyClient({
  members,
  detailsByMember,
}: {
  members: FamilyMember[];
  detailsByMember: Record<string, MemberDetail[]>;
}) {
  const [hohOpen, setHohOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [adding, setAdding] = useState(false);

  const hoh = members.filter((m) => m.isHeadOfHousehold);

  return (
    <>
      {/* Head of household */}
      <div className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em]">
            Head of household
          </span>
          <button
            type="button"
            onClick={() => setHohOpen(true)}
            className="text-[13px] font-semibold text-primary"
          >
            Edit
          </button>
        </div>
        {hoh.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hoh.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 bg-mist rounded-pill pl-1.5 pr-3 py-1"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ background: ACCENT_HEX[m.accentColor] }}
                >
                  {initialsOf(m.name)}
                </span>
                <span className="text-[13px] font-semibold text-ink">{m.name.split(" ")[0]}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-label">No one is marked head of household yet.</p>
        )}
        <p className="text-[12px] text-muted-label mt-2.5">
          More than one person can hold this. Informational only for now.
        </p>
      </div>

      {/* Members */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase">
            Household members
          </h2>
          <span className="text-[12px] text-muted-label">
            {members.length} {members.length === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="bg-surface rounded-card overflow-hidden shadow-sm shadow-black/5">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing(m)}
              className="w-full flex items-center gap-3 p-4 text-left border-b border-[#F1F3F6] last:border-b-0 hover:bg-mist/60 transition-colors"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                style={{ background: ACCENT_HEX[m.accentColor] }}
              >
                {initialsOf(m.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-semibold text-ink">{m.name}</span>
                  {m.isHeadOfHousehold && (
                    <span className="text-[9.5px] font-bold text-accent-gold bg-accent-gold/15 rounded-pill px-1.5 py-px">
                      HOH
                    </span>
                  )}
                </span>
                <span className="block text-[12.5px] text-muted-label mt-0.5">
                  {m.relationship || (m.isAdult ? "Adult" : "Child")}
                </span>
              </span>
              <ChevronRight size={17} className="text-border shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-input border border-dashed border-border text-primary text-[14px] font-semibold hover:bg-mist/60 transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} /> Add family member
      </button>

      <HeadOfHouseholdDialog open={hohOpen} onClose={() => setHohOpen(false)} members={members} />
      {editing && (
        <EditMemberDialog
          open
          onClose={() => setEditing(null)}
          member={editing}
          allMembers={members}
          details={detailsByMember[editing.id] ?? []}
        />
      )}
      {adding && (
        <EditMemberDialog open onClose={() => setAdding(false)} allMembers={members} />
      )}
    </>
  );
}
