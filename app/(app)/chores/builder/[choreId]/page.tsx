import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getChoreById } from "@/lib/data/chores";
import { effectiveIsAdult } from "@/lib/family";
import { ChoreForm } from "@/components/chores/ChoreForm";

export const dynamic = "force-dynamic";

export default async function EditChorePage(props: PageProps<"/chores/builder/[choreId]">) {
  const { choreId } = await props.params;
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  if (activeMember && !effectiveIsAdult(activeMember)) redirect("/chores");

  const chore = await getChoreById(choreId);
  if (!chore) notFound();
  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/chores" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Edit chore</h1>
      </div>
      <ChoreForm kids={kids} chore={chore} />
    </>
  );
}
