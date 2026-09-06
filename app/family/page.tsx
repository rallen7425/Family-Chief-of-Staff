import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock } from "lucide-react";
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

      <Link
        href="/settings/arrival"
        className="flex items-center justify-between gap-2 bg-surface rounded-card p-4 shadow-sm shadow-black/5"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-accent-gold/15 flex items-center justify-center shrink-0">
            <Clock size={17} className="text-accent-gold" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink">Arrival buffer defaults</span>
            <span className="block text-[12px] text-muted-label mt-0.5">
              Fallback &ldquo;arrive N min early&rdquo; by activity type
            </span>
          </span>
        </span>
        <ChevronRight size={18} className="text-border shrink-0" />
      </Link>
    </>
  );
}
