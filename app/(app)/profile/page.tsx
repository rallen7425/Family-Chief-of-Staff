import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getMemberDetails } from "@/lib/data/memberDetails";
import { getEmailConnectionsByMember } from "@/lib/data/emailConnections";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import { MyProfileClient } from "@/components/profile/MyProfileClient";

export const dynamic = "force-dynamic";

export default async function MyProfilePage(props: PageProps<"/profile">) {
  const searchParams = await props.searchParams;
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

  const [details, connections] = await Promise.all([
    getMemberDetails(member.id),
    getEmailConnectionsByMember(member.id),
  ]);
  const connected = typeof searchParams.connected === "string" ? searchParams.connected : undefined;
  const connectError = typeof searchParams.connectError === "string" ? searchParams.connectError : undefined;

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

      {member.isHeadOfHousehold && (
        <Link
          href="/family"
          className="-mt-2 inline-flex items-center gap-1 self-start text-[13.5px] font-semibold text-primary"
        >
          Manage Family
          <ChevronRight size={15} />
        </Link>
      )}

      <MyProfileClient
        member={member}
        members={familyMembers}
        details={details}
        connections={connections}
        connected={connected}
        connectError={connectError}
      />
    </>
  );
}
