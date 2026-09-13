import { format } from "date-fns";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
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
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  // The lock screen (app/layout.tsx) gates the whole app when no member is
  // active — an empty roster is the only way this is reached with none.
  if (!activeMember) return null;

  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  if (effectiveIsAdult(activeMember)) {
    const [chores, allPoints, pendingClaims, completionsByKid] = await Promise.all([
      getChores(),
      getAllMemberPoints(kids.map((k) => k.id)),
      getPendingGoalClaims(),
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
    getActiveChoresForMember(activeMember.id),
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
