import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getMemberDetails } from "@/lib/data/memberDetails";
import { AdditionalContextDetails } from "@/components/profile/AdditionalContextDetails";

export const dynamic = "force-dynamic";

export default async function FamilyMemberDetailsPage(
  props: PageProps<"/family/[memberId]/details">
) {
  const { memberId } = await props.params;
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (!activeMember?.isHeadOfHousehold) redirect("/profile");

  const member = familyMembers.find((m) => m.id === memberId);
  if (!member) notFound();
  const items = await getMemberDetails(member.id);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link
          href={`/family/${member.id}`}
          aria-label="Back"
          className="text-ink hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[22px] leading-tight text-ink">
          {member.name} — Additional Context and Details
        </h1>
      </div>
      <AdditionalContextDetails member={member} items={items} defaultOpen />
    </>
  );
}
