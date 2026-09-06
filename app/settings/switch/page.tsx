import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { MemberPicker } from "@/components/auth/MemberPicker";

export const dynamic = "force-dynamic";

export default async function SwitchAccountPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[22px] leading-tight text-ink">
          Switch Account
        </h1>
      </div>
      <p className="text-[12.5px] text-muted-label leading-relaxed">
        Choose whose profile this device is using. Device convenience only — accounts and sign-in
        come later.
      </p>
      <MemberPicker members={familyMembers} currentId={activeMember?.id ?? null} />
    </>
  );
}
