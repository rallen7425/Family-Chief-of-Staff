import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getMemberDetails } from "@/lib/data/memberDetails";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import { ManageMemberClient } from "@/components/family/ManageMemberClient";

export const dynamic = "force-dynamic";

export default async function FamilyMemberPage(props: PageProps<"/family/[memberId]">) {
  const { memberId } = await props.params;
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (!activeMember?.isHeadOfHousehold) redirect("/profile");

  const member = familyMembers.find((m) => m.id === memberId);
  if (!member) notFound();
  const details = await getMemberDetails(member.id);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/family" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">
          {member.name}
        </h1>
      </div>

      <div className="bg-surface rounded-card p-6 flex flex-col items-center gap-3 shadow-sm shadow-black/5">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white font-display font-bold text-[26px]"
          style={{ background: ACCENT_HEX[member.accentColor] }}
        >
          {initialsOf(member.name)}
        </div>
        {member.isHeadOfHousehold && (
          <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-pill bg-accent-gold/15 text-accent-gold">
            Head of Household
          </span>
        )}
      </div>

      <ManageMemberClient member={member} allMembers={familyMembers} details={details} />
    </>
  );
}
