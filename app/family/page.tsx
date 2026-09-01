import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getHomeLocation } from "@/lib/data/locations";
import { getMemberDetails } from "@/lib/data/memberDetails";
import { HomeLocationCard } from "@/components/family/HomeLocationCard";
import { ManageFamilyClient } from "@/components/family/ManageFamilyClient";
import type { MemberDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManageFamilyPage() {
  const [familyMembers, home] = await Promise.all([getFamilyMembers(), getHomeLocation()]);
  const detailsByMember: Record<string, MemberDetail[]> = {};
  await Promise.all(
    familyMembers.map(async (m) => {
      detailsByMember[m.id] = await getMemberDetails(m.id);
    })
  );

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Manage Family</h1>
      </div>

      <HomeLocationCard address={home?.address ?? null} />

      <ManageFamilyClient members={familyMembers} detailsByMember={detailsByMember} />
    </>
  );
}
