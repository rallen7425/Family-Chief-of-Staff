import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { effectiveIsAdult } from "@/lib/family";
import { getGoalById } from "@/lib/data/goals";
import { GoalForm } from "@/components/chores/GoalForm";

export const dynamic = "force-dynamic";

export default async function EditGoalPage(props: PageProps<"/chores/goals/[goalId]">) {
  const { goalId } = await props.params;
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (activeMember && !effectiveIsAdult(activeMember)) redirect("/chores/goals");

  const goal = await getGoalById(goalId);
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
