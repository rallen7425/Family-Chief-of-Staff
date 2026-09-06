"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import { ColorGrid } from "@/components/family/ColorGrid";
import { saveFamilyMember, type FamilyMemberInput } from "@/lib/actions/familyMembers";
import { ageInYears, computeIsAdult, colorInUseByOthers, initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { AccentColor, FamilyMember } from "@/lib/types";

const LABEL = "text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block";
const INPUT = "w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-ink";

/**
 * Add a family member. Editing an existing member now happens on the
 * dedicated `/family/[memberId]` page (mirrors My Profile), so this dialog
 * is create-only.
 */
export function EditMemberDialog({
  open,
  onClose,
  allMembers,
}: {
  open: boolean;
  onClose: () => void;
  allMembers: FamilyMember[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [accentColor, setAccentColor] = useState<AccentColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  // Birthday is authoritative; without one a new member defaults to adult.
  const isAdult = birthday ? computeIsAdult(birthday) : true;
  const age = ageInYears(birthday || null);

  function save() {
    setError(null);
    const input: FamilyMemberInput = {
      name,
      accentColor,
      relationship: relationship.trim() || null,
      birthday: birthday || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      school: school.trim() || null,
      grade: grade.trim() || null,
    };
    start(async () => {
      const res = await saveFamilyMember(input);
      if (res.error) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Family Member">
      <div className="flex flex-col gap-[18px]">
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-display font-bold text-[22px]"
            style={{ background: ACCENT_HEX[accentColor] }}
          >
            {initialsOf(name || "?")}
          </div>
        </div>

        <div>
          <span className={LABEL}>Name</span>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div>
          <span className={LABEL}>Relationship</span>
          <input
            className={INPUT}
            value={relationship}
            placeholder="e.g. Mom, Dad, Step-Dad, Grandma, Guardian"
            onChange={(e) => setRelationship(e.target.value)}
          />
        </div>

        <div>
          <span className={LABEL}>Birthday</span>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className={`${INPUT} flex-1`}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            <span className="text-[13px] text-muted-label font-medium whitespace-nowrap">
              {age === null ? "" : `Age ${age}`}
            </span>
          </div>
        </div>

        {isAdult ? (
          <>
            <div>
              <span className={LABEL}>Email address</span>
              <input
                className={INPUT}
                value={email}
                placeholder="e.g. name@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <span className={LABEL}>Phone number</span>
              <input
                className={INPUT}
                value={phone}
                placeholder="e.g. (978) 555-0148"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="flex gap-2.5">
            <div className="flex-[2]">
              <span className={LABEL}>School</span>
              <input className={INPUT} value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>
            <div className="flex-1">
              <span className={LABEL}>Grade</span>
              <input className={INPUT} value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
          </div>
        )}

        <ColorGrid
          value={accentColor}
          onChange={setAccentColor}
          conflictWith={(c) => colorInUseByOthers(allMembers, c, null)}
        />

        {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

        <div className="flex gap-2.5 mt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-input border border-border text-muted-text text-[15px] font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="flex-1 py-3 rounded-input bg-primary text-white text-[15px] font-semibold disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
