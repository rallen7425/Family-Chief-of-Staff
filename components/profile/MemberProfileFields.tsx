"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { InlineEditField } from "@/components/profile/InlineEditField";
import { ColorSwatchField } from "@/components/profile/ColorSwatchField";
import { updateProfileFields } from "@/lib/actions/familyMembers";
import { ageInYears, colorInUseByOthers, effectiveIsAdult } from "@/lib/family";
import type { AccentColor, FamilyMember } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_COLORS: AccentColor[] = ["coral", "teal", "gold", "berry", "blue", "purple"];
const LABEL = "text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block";

function formatBirthday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * The identity/contact field stack shared by My Profile (`mode="self"`) and
 * the Manage Family member view (`mode="manage"`). Same fields, same
 * behaviour; `manage` additionally lets you edit birthday and (for a child)
 * school / grade.
 */
export function MemberProfileFields({
  member,
  allMembers,
  mode,
}: {
  member: FamilyMember;
  allMembers: FamilyMember[];
  mode: "self" | "manage";
}) {
  const canEditIdentity = mode === "manage";
  const isChild = !effectiveIsAdult(member);
  // A kid's birthday is trust-sensitive (it drives the adult/child split
  // itself) so it's parent/HoH-only, edited from Manage Family. An adult's
  // own birthday carries no such risk — they can set it on their own My
  // Profile too, not just when a HoH is managing them from Manage Family.
  const canEditBirthday = canEditIdentity || !isChild;
  const age = ageInYears(member.birthday ?? null);

  return (
    <div className="bg-surface rounded-card p-5 flex flex-col gap-[18px] shadow-sm shadow-black/5">
      <InlineEditField
        label="Name"
        value={member.name}
        validate={(v) => (v.trim() ? null : "Name can't be blank.")}
        onSave={(v) => updateProfileFields(member.id, { name: v })}
      />
      <InlineEditField
        label="Relationship"
        value={member.relationship ?? ""}
        placeholder="e.g. Mom, Dad, Step-Dad, Grandma, Guardian"
        emptyText="Add relationship"
        validate={(v) => (v.trim() ? null : "Relationship can't be blank.")}
        onSave={(v) => updateProfileFields(member.id, { relationship: v })}
      />

      {canEditBirthday ? (
        <BirthdayField member={member} />
      ) : (
        <div>
          <span className={LABEL}>Birthday</span>
          <span className="text-[15px] text-ink font-medium">
            {member.birthday ? (
              <>
                {formatBirthday(member.birthday)}
                {age !== null && (
                  <span className="text-muted-label font-normal"> · Age {age}</span>
                )}
              </>
            ) : (
              <span className="text-muted-label">Not set — ask a parent to add it</span>
            )}
          </span>
        </div>
      )}

      <InlineEditField
        label="Email address"
        value={member.email ?? ""}
        placeholder="e.g. name@example.com"
        emptyText="Add email address"
        validate={(v) => (!v.trim() || EMAIL_RE.test(v.trim()) ? null : "Enter a valid email address.")}
        onSave={(v) => updateProfileFields(member.id, { email: v })}
      />
      <InlineEditField
        label="Phone number"
        value={member.phone ?? ""}
        placeholder="e.g. (978) 555-0148"
        emptyText="Add phone number"
        validate={(v) => {
          const d = v.replace(/\D/g, "");
          return !v.trim() || (d.length >= 7 && d.length <= 15) ? null : "Enter a valid phone number.";
        }}
        onSave={(v) => updateProfileFields(member.id, { phone: v })}
      />

      {canEditIdentity && isChild && (
        <>
          <InlineEditField
            label="School"
            value={member.school ?? ""}
            emptyText="Add school"
            onSave={(v) => updateProfileFields(member.id, { school: v })}
          />
          <InlineEditField
            label="Grade"
            value={member.grade ?? ""}
            emptyText="Add grade"
            onSave={(v) => updateProfileFields(member.id, { grade: v })}
          />
        </>
      )}

      <ColorSwatchField
        value={member.accentColor}
        colors={PROFILE_COLORS}
        conflictWith={(c) => colorInUseByOthers(allMembers, c, member.id)}
        onSave={(c) => updateProfileFields(member.id, { accentColor: c })}
      />
    </div>
  );
}

function BirthdayField({ member }: { member: FamilyMember }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.birthday ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const age = ageInYears(draft || member.birthday || null);

  function save() {
    setError(null);
    start(async () => {
      const res = await updateProfileFields(member.id, { birthday: draft });
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div>
      <span className={LABEL}>Birthday</span>
      {editing ? (
        <>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="date"
              autoFocus
              className="flex-1 bg-mist border border-primary rounded-input px-3.5 py-2.5 text-[15px] text-ink"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {age !== null && (
              <span className="text-[13px] text-muted-label whitespace-nowrap">Age {age}</span>
            )}
          </div>
          {error && <p className="text-[12px] text-accent-berry mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="flex-1 py-2 rounded-input bg-primary text-white text-[13px] font-semibold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(member.birthday ?? "");
                setEditing(false);
              }}
              disabled={isPending}
              className="flex-1 py-2 rounded-input border border-border text-muted-text text-[13px] font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2.5">
          <span className={`text-[15px] ${member.birthday ? "text-ink font-medium" : "text-muted-label"}`}>
            {member.birthday ? (
              <>
                {formatBirthday(member.birthday)}
                {age !== null && <span className="text-muted-label font-normal"> · Age {age}</span>}
              </>
            ) : (
              "Add birthday"
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(member.birthday ?? "");
              setError(null);
              setEditing(true);
            }}
            aria-label="Edit birthday"
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-muted-label hover:text-primary shrink-0"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
