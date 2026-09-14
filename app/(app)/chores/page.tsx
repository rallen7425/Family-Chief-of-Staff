import { format } from "date-fns";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getCurrentMember } from "@/lib/currentMember";
import { effectiveIsAdult } from "@/lib/family";
import {
  getChores,
  getActiveChoresForMember,
  getCompletionsForMember,
  getAllMemberPoints,
  getMemberPoints,
} from "@/lib/data/chores";
import { getPendingGoalClaims } from "@/lib/data/goals";
import { occurrencesToday } from "@/lib/chores";
import { ParentDashboard } from "@/components/chores/ParentDashboard";
import { TodaysChores } from "@/components/chores/TodaysChores";

export const dynamic = "force-dynamic";

export default async function ChoresPage() {
  const activeMember = await getCurrentMember();
  // The (app) layout always redirects to /signin with no signed-in member —
  // this is just for type narrowing below.
  if (!activeMember) return null;
  const householdId = activeMember.householdId;
  const familyMembers = await getFamilyMembers(householdId);

  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  if (effectiveIsAdult(activeMember)) {
    const [chores, allPoints, pendingClaims, completionsByKid] = await Promise.all([
      getChores(householdId),
      getAllMemberPoints(kids.map((k) => k.id)),
      getPendingGoalClaims(householdId),
      Promise.all(kids.map((k) => getCompletionsForMember(k.id))),
    ]);
    return (
      <ParentDashboard
        kids={kids}
        chores={chores}
        pointsByKid={allPoints}
        completionsByKid={completionsByKid}
        pendingClaimCount={pendingClaims.length}
      />
    );
  }

  const [chores, completions, points] = await Promise.all([
    getActiveChoresForMember(householdId, activeMember.id),
    getCompletionsForMember(activeMember.id),
    getMemberPoints(activeMember.id),
  ]);
  const today = format(new Date(), "yyyy-MM-dd");
  const todaysAll = occurrencesToday(chores, completions);
  const doneChoreIds = todaysAll
    .filter((c) => completions.some((comp) => comp.choreId === c.id && comp.completedOn === today))
    .map((c) => c.id);

  return <TodaysChores member={activeMember} chores={todaysAll} doneChoreIds={doneChoreIds} points={points} />;
}
