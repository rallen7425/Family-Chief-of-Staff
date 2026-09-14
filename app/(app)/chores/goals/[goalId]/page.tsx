import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getCurrentMember } from "@/lib/currentMember";
import { effectiveIsAdult } from "@/lib/family";
import { getGoalById } from "@/lib/data/goals";
import { GoalForm } from "@/components/chores/GoalForm";

export const dynamic = "force-dynamic";

export default async function EditGoalPage(props: PageProps<"/chores/goals/[goalId]">) {
  const { goalId } = await props.params;
  const activeMember = await getCurrentMember();
  if (!activeMember) return null;
  if (!effectiveIsAdult(activeMember)) redirect("/chores/goals");
  const familyMembers = await getFamilyMembers(activeMember.householdId);

  const goal = await getGoalById(activeMember.householdId, goalId);
  if (!goal) notFound();
  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/chores/goals" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Edit Goal</h1>
      </div>
      <GoalForm kids={kids} goal={goal} />
    </>
  );
}
