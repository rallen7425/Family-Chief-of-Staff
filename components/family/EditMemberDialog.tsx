"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { ColorGrid } from "@/components/family/ColorGrid";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import { MemberDetailsDialog } from "@/components/family/MemberDetailsDialog";
import { saveFamilyMember, removeFamilyMember, type FamilyMemberInput } from "@/lib/actions/familyMembers";
import { ageInYears, computeIsAdult, colorInUseByOthers, effectiveIsAdult, initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { AccentColor, FamilyMember, MemberDetail } from "@/lib/types";

const LABEL = "text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-1.5 block";
const INPUT =
  "w-full bg-mist border border-border rounded-input px-3.5 py-2.5 text-[15px] text-ink";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function EditMemberDialog({
  open,
  onClose,
  member,
  allMembers,
  details = [],
}: {
  open: boolean;
  onClose: () => void;
  /** undefined = create mode. */
  member?: FamilyMember;
  allMembers: FamilyMember[];
  details?: MemberDetail[];
}) {
  const router = useRouter();
  const isCreate = !member;

  const [name, setName] = useState(member?.name ?? "");
  const [relationship, setRelationship] = useState(member?.relationship ?? "");
  const [birthday, setBirthday] = useState(member?.birthday ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [school, setSchool] = useState(member?.school ?? "");
  const [grade, setGrade] = useState(member?.grade ?? "");
  const [accentColor, setAccentColor] = useState<AccentColor>(member?.accentColor ?? "blue");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isPending, start] = useTransition();

  // A birthday is authoritative; without one, keep the member's stored age
  // class (new members default to adult).
  const isAdult = birthday
    ? computeIsAdult(birthday)
    : member
      ? effectiveIsAdult(member)
      : true;
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
      const res = await saveFamilyMember(input, member?.id);
      if (res.error) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeFamilyMember(member!.id);
      if (res.error) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isCreate ? "Add Family Member" : "Edit Family Member"}>
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

        {isAdult && !isCreate && member?.isHeadOfHousehold && (
          <div className="flex items-center gap-2 bg-accent-gold/15 rounded-input px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold text-accent-gold">
              Head of household — managed from Manage Family
            </span>
          </div>
        )}

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
          conflictWith={(c) => colorInUseByOthers(allMembers, c, member?.id ?? null)}
        />

        {!isCreate && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="w-full flex items-center justify-between bg-mist border border-border rounded-input px-3.5 py-3 text-left"
          >
            <span className="block text-[14px] font-semibold text-ink">
              Activities, teams, &amp; additional details
            </span>
            <ChevronRight size={17} className="text-muted-label" />
          </button>
        )}

        {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

        {!isCreate && (
          <div className="border-t border-border pt-4 flex flex-col gap-2.5">
            <p className="text-[11px] font-bold text-muted-label uppercase tracking-[0.03em]">Danger zone</p>
            <button
              type="button"
              onClick={() => setForgetOpen(true)}
              className="flex items-center gap-2 text-accent-berry text-[13.5px] font-semibold self-start"
            >
              <Trash2 size={15} /> Forget {firstName(member!.name)}&rsquo;s info
            </button>
            {confirmRemove ? (
              <div className="rounded-input bg-accent-berry/10 p-3">
                <p className="text-[13px] font-semibold text-ink">
                  Remove {firstName(member!.name)} from the family? Their past calendar entries stay,
                  but the person is deleted.
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    disabled={isPending}
                    className="flex-1 py-2 rounded-input border border-border text-muted-text text-[13px] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={isPending}
                    className="flex-1 py-2 rounded-input bg-accent-berry text-white text-[13px] font-semibold disabled:opacity-60"
                  >
                    {isPending ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="flex items-center gap-2 text-accent-berry text-[13.5px] font-semibold self-start"
              >
                <Trash2 size={15} /> Remove {firstName(member!.name)} from family
              </button>
            )}
          </div>
        )}

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

      {!isCreate && (
        <>
          <ForgetDialog
            open={forgetOpen}
            onClose={() => setForgetOpen(false)}
            members={allMembers}
            preselectedMemberId={member!.id}
          />
          <MemberDetailsDialog
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            member={member!}
            items={details}
          />
        </>
      )}
    </Modal>
  );
}
