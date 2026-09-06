import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getHomeLocation } from "@/lib/data/locations";
import { HomeLocationCard } from "@/components/family/HomeLocationCard";
import { ManageFamilyClient } from "@/components/family/ManageFamilyClient";

export const dynamic = "force-dynamic";

export default async function ManageFamilyPage() {
  const [familyMembers, home] = await Promise.all([getFamilyMembers(), getHomeLocation()]);
  // HoH-gated (a UI convenience — no auth). Others only see their own profile.
  const activeMember = await getActiveMember(familyMembers);
  if (!activeMember?.isHeadOfHousehold) redirect("/profile");

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Manage Family</h1>
      </div>

      <HomeLocationCard address={home?.address ?? null} />

      <ManageFamilyClient members={familyMembers} />
    </>
  );
}
