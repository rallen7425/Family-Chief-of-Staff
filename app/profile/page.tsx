import Link from "next/link";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import { MyProfileClient } from "@/components/profile/MyProfileClient";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const familyMembers = await getFamilyMembers();
  const member = await getActiveMember(familyMembers);

  if (!member) {
    return (
      <>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">My Profile</h1>
        <p className="text-[14px] text-muted-label">No family members yet.</p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">My Profile</h1>
      </div>

      <div className="bg-surface rounded-card p-6 flex flex-col items-center gap-3 shadow-sm shadow-black/5">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white font-display font-bold text-[26px]"
          style={{ background: ACCENT_HEX[member.accentColor] }}
        >
          {initialsOf(member.name)}
        </div>
        {member.isHeadOfHousehold && (
          <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-pill bg-accent-gold/15 text-accent-gold">
            Head of Household
          </span>
        )}
      </div>

      <MyProfileClient member={member} members={familyMembers} />

      {member.isHeadOfHousehold && (
        <Link
          href="/family"
          className="flex items-center justify-between bg-surface rounded-card p-4 shadow-sm shadow-black/5"
        >
          <span className="flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-full bg-[#F3EEF9] flex items-center justify-center">
              <Users size={17} style={{ color: "#7C5CBF" }} />
            </span>
            <span className="text-[14px] font-semibold text-ink">Manage Family</span>
          </span>
          <ChevronRight size={18} className="text-border" />
        </Link>
      )}
    </>
  );
}
