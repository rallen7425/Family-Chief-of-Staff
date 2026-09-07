"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { MemberProfileFields } from "@/components/profile/MemberProfileFields";
import { AdditionalContextDetails } from "@/components/profile/AdditionalContextDetails";
import { ConnectedAccounts } from "@/components/profile/ConnectedAccounts";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import type { EmailConnectionSummary, FamilyMember, MemberDetail } from "@/lib/types";

export function MyProfileClient({
  member,
  members,
  details,
  connections,
  connected,
  connectError,
}: {
  member: FamilyMember;
  members: FamilyMember[];
  details: MemberDetail[];
  connections: EmailConnectionSummary[];
  connected?: string;
  connectError?: string;
}) {
  const [forgetOpen, setForgetOpen] = useState(false);

  return (
    <>
      <MemberProfileFields member={member} allMembers={members} mode="self" />

      <ConnectedAccounts connections={connections} connected={connected} connectError={connectError} />

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
