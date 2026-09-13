import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getCompletionsForMember, getMemberPoints } from "@/lib/data/chores";
import { MyProgress } from "@/components/chores/MyProgress";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (!activeMember) return null;

  const [completions, points] = await Promise.all([
    getCompletionsForMember(activeMember.id),
    getMemberPoints(activeMember.id),
  ]);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/chores" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-[13px] text-muted-label">Back to Chores</span>
      </div>
      <MyProgress member={activeMember} points={points} completions={completions} />
    </>
  );
}
