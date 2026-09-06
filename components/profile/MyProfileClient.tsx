"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { MemberProfileFields } from "@/components/profile/MemberProfileFields";
import { AdditionalContextDetails } from "@/components/profile/AdditionalContextDetails";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import type { FamilyMember, MemberDetail } from "@/lib/types";

export function MyProfileClient({
  member,
  members,
  details,
}: {
  member: FamilyMember;
  members: FamilyMember[];
  details: MemberDetail[];
}) {
  const [forgetOpen, setForgetOpen] = useState(false);

  return (
    <>
      <MemberProfileFields member={member} allMembers={members} mode="self" />

      <AdditionalContextDetails
        member={member}
        items={details}
        viewAllHref="/profile/details"
      />

      <button
        type="button"
        onClick={() => setForgetOpen(true)}
        className="mt-2 flex items-center gap-2 py-1.5 text-accent-berry text-[13.5px] font-semibold self-start"
      >
        <Shield size={16} />
        Forget my info
      </button>

      <ForgetDialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        members={members}
        defaultMemberId={member.id}
      />
    </>
  );
}
