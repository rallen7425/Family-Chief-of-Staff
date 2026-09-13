import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getMemberDetails } from "@/lib/data/memberDetails";
import { AdditionalContextDetails } from "@/components/profile/AdditionalContextDetails";

export const dynamic = "force-dynamic";

export default async function MyProfileDetailsPage() {
  const familyMembers = await getFamilyMembers();
  const member = await getActiveMember(familyMembers);
  if (!member) return null;
  const items = await getMemberDetails(member.id);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/profile" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[22px] leading-tight text-ink">
          Additional Context and Details
        </h1>
      </div>
      <AdditionalContextDetails member={member} items={items} defaultOpen />
    </>
  );
}
