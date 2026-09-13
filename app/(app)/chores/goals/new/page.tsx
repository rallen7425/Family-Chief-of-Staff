import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { effectiveIsAdult } from "@/lib/family";
import { GoalForm } from "@/components/chores/GoalForm";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (activeMember && !effectiveIsAdult(activeMember)) redirect("/chores/goals");
  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/chores/goals" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Add Goal</h1>
      </div>
      <GoalForm kids={kids} />
    </>
  );
}
