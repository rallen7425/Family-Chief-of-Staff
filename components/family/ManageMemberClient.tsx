"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Trash2 } from "lucide-react";
import { MemberProfileFields } from "@/components/profile/MemberProfileFields";
import { AdditionalContextDetails } from "@/components/profile/AdditionalContextDetails";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import { removeFamilyMember } from "@/lib/actions/familyMembers";
import type { FamilyMember, MemberDetail } from "@/lib/types";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function ManageMemberClient({
  member,
  allMembers,
  details,
}: {
  member: FamilyMember;
  allMembers: FamilyMember[];
  details: MemberDetail[];
}) {
  const router = useRouter();
  const [forgetOpen, setForgetOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeFamilyMember(member.id);
      if (res.error) return setError(res.error);
      router.push("/family");
      router.refresh();
    });
  }

  return (
    <>
      <MemberProfileFields member={member} allMembers={allMembers} mode="manage" />

      <AdditionalContextDetails
        member={member}
        items={details}
        viewAllHref={`/family/${member.id}/details`}
      />

      <div className="mt-2 border-t border-border pt-4 flex flex-col gap-2.5">
        <p className="text-[11px] font-bold text-muted-label uppercase tracking-[0.03em]">
          Danger zone
        </p>
        {error && <p className="text-[13px] text-accent-berry font-medium">{error}</p>}

        <button
          type="button"
          onClick={() => setForgetOpen(true)}
          className="flex items-center gap-2 text-accent-berry text-[13.5px] font-semibold self-start"
        >
          <Shield size={15} /> Forget {firstName(member.name)}&rsquo;s info
        </button>

        {confirmRemove ? (
          <div className="rounded-input bg-accent-berry/10 p-3">
            <p className="text-[13px] font-semibold text-ink">
              Remove {firstName(member.name)} from the family? Their past calendar entries stay, but
              the person is deleted.
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
            <Trash2 size={15} /> Remove {firstName(member.name)} from family
          </button>
        )}
      </div>

      <ForgetDialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        members={allMembers}
        defaultMemberId={member.id}
      />
    </>
  );
}
