import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { effectiveIsAdult } from "@/lib/family";
import { getMemberPoints } from "@/lib/data/chores";
import { getGoals, getGoalClaimsForMember, getPendingGoalClaims } from "@/lib/data/goals";
import { GoalsChild } from "@/components/chores/GoalsChild";
import { GoalsParent } from "@/components/chores/GoalsParent";

export const dynamic = "force-dynamic";

function BackLink() {
  return (
    <div className="flex items-center gap-2.5">
      <Link href="/chores" aria-label="Back" className="text-ink hover:text-primary transition-colors">
        <ArrowLeft size={20} />
      </Link>
      <span className="text-[13px] text-muted-label">Back to Chores</span>
    </div>
  );
}

export default async function GoalsPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (!activeMember) return null;

  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));
  const goals = await getGoals();

  if (effectiveIsAdult(activeMember)) {
    const pending = await getPendingGoalClaims();
    const memberById = new Map(familyMembers.map((m) => [m.id, m]));
    const goalById = new Map(goals.map((g) => [g.id, g]));
    const pendingClaims = pending.map((claim) => ({
      claim,
      member: memberById.get(claim.familyMemberId),
      goal: goalById.get(claim.goalId),
    }));
    return (
      <>
        <BackLink />
        <GoalsParent pendingClaims={pendingClaims} goals={goals} kids={kids} />
      </>
    );
  }

  const [claims, points] = await Promise.all([
    getGoalClaimsForMember(activeMember.id),
    getMemberPoints(activeMember.id),
  ]);
  return (
    <>
      <BackLink />
      <GoalsChild member={activeMember} goals={goals} claims={claims} balance={points.balance} />
    </>
  );
}
