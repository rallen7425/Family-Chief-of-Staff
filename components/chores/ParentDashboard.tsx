import Link from "next/link";
import { format, subDays } from "date-fns";
import { Flame, ChevronRight } from "lucide-react";
import { ACCENT_HEX } from "@/lib/colors";
import { occurrencesToday } from "@/lib/chores";
import type { Chore, ChoreCompletion, FamilyMember, MemberPoints } from "@/lib/types";

interface ParentDashboardProps {
  kids: FamilyMember[];
  chores: Chore[];
  pointsByKid: MemberPoints[];
  completionsByKid: ChoreCompletion[][];
  pendingClaimCount: number;
}

function emptyPoints(familyMemberId: string): MemberPoints {
  return { familyMemberId, balance: 0, currentStreak: 0, longestStreak: 0 };
}

export function ParentDashboard({ kids, chores, pointsByKid, completionsByKid, pendingClaimCount }: ParentDashboardProps) {
  const pointsById = new Map(pointsByKid.map((p) => [p.familyMemberId, p]));
  const completionsById = new Map(kids.map((k, i) => [k.id, completionsByKid[i] ?? []]));

  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const completionsThisWeek = completionsByKid.flat().filter((c) => c.completedOn >= weekAgo).length;
  const activeStreaks = pointsByKid.filter((p) => p.currentStreak > 0).length;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Chores</h1>
        <Link
          href="/chores/builder"
          className="px-4 py-2 rounded-pill bg-primary text-white text-[13px] font-semibold shrink-0 hover:bg-primary-hover transition-colors"
        >
          + New Chore
        </Link>
      </div>

      <section className="bg-surface rounded-card p-5 shadow-sm shadow-black/5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[22px] font-display font-semibold text-ink">{completionsThisWeek}</p>
          <p className="text-[11.5px] text-muted-label">This week</p>
        </div>
        <div>
          <p className="text-[22px] font-display font-semibold text-ink">{activeStreaks}</p>
          <p className="text-[11.5px] text-muted-label">Active streaks</p>
        </div>
        <Link href="/chores/goals" className="block">
          <p className={`text-[22px] font-display font-semibold ${pendingClaimCount > 0 ? "text-primary" : "text-ink"}`}>
            {pendingClaimCount}
          </p>
          <p className="text-[11.5px] text-muted-label">Pending requests</p>
        </Link>
      </section>

      <div className="flex flex-col gap-3">
        {kids.map((kid) => {
          const points = pointsById.get(kid.id) ?? emptyPoints(kid.id);
          const kidChores = chores.filter((c) => c.active && c.assigneeMemberIds.includes(kid.id));
          const kidCompletions = completionsById.get(kid.id) ?? [];
          const today = format(new Date(), "yyyy-MM-dd");
          const todaysAll = occurrencesToday(kidChores, kidCompletions);
          const doneToday = todaysAll.filter((c) =>
            kidCompletions.some((comp) => comp.choreId === c.id && comp.completedOn === today)
          ).length;
          const color = ACCENT_HEX[kid.accentColor];

          return (
            <div key={kid.id} className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5">
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold font-display shrink-0"
                style={{ background: color }}
              >
                {kid.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-ink">{kid.name}</p>
                <p className="text-[12.5px] text-muted-label">
                  {todaysAll.length > 0 ? `${doneToday} of ${todaysAll.length} done today` : "Nothing due today"}
                  {points.currentStreak > 0 && (
                    <span className="inline-flex items-center gap-0.5 ml-2 text-accent-gold font-medium">
                      <Flame size={11} className="fill-accent-gold" /> {points.currentStreak}
                    </span>
                  )}
                </p>
                {todaysAll.length > 0 && (
                  <div className="mt-1.5 h-1.5 w-full max-w-[160px] rounded-pill bg-mist overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all"
                      style={{ width: `${(doneToday / todaysAll.length) * 100}%`, background: color }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[15px] font-semibold text-ink shrink-0">{points.balance} pts</p>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">All chores</h2>
        <div className="flex flex-col gap-2">
          {chores.length === 0 && <p className="text-[14px] text-muted-label">No chores yet.</p>}
          {chores.map((chore) => (
            <Link
              key={chore.id}
              href={`/chores/builder/${chore.id}`}
              className="bg-surface rounded-card p-3.5 shadow-sm shadow-black/5 flex items-center gap-3 hover:bg-mist/40 transition-colors"
            >
              <div className={`flex-1 min-w-0 ${chore.active ? "" : "opacity-50"}`}>
                <p className="text-[14px] font-medium text-ink truncate">{chore.title}</p>
                <p className="text-[12px] text-muted-label">
                  {chore.points} pts · {chore.assigneeMemberIds.map((id) => kids.find((k) => k.id === id)?.name).filter(Boolean).join(", ") || "Unassigned"}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-label shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
