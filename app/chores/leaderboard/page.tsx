import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { subDays, format } from "date-fns";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { effectiveIsAdult } from "@/lib/family";
import { getCompletionsForMember, getAllMemberPoints } from "@/lib/data/chores";
import { Leaderboard } from "@/components/chores/Leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const familyMembers = await getFamilyMembers();
  const kids = familyMembers.filter((m) => !effectiveIsAdult(m));

  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const [completionsByKid, pointsByKid] = await Promise.all([
    Promise.all(kids.map((k) => getCompletionsForMember(k.id))),
    getAllMemberPoints(kids.map((k) => k.id)),
  ]);
  const pointsById = new Map(pointsByKid.map((p) => [p.familyMemberId, p]));

  const entries = kids.map((member, i) => ({
    member,
    weeklyPoints: (completionsByKid[i] ?? [])
      .filter((c) => c.completedOn >= weekAgo)
      .reduce((sum, c) => sum + c.pointsAwarded, 0),
    points: pointsById.get(member.id) ?? {
      familyMemberId: member.id,
      balance: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  }));

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/chores" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-[13px] text-muted-label">Back to Chores</span>
      </div>
      <Leaderboard entries={entries} />
    </>
  );
}
