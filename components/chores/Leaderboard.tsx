import { Flame, Trophy } from "lucide-react";
import { ACCENT_HEX } from "@/lib/colors";
import type { FamilyMember, MemberPoints } from "@/lib/types";

interface LeaderboardEntry {
  member: FamilyMember;
  weeklyPoints: number;
  points: MemberPoints;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const RANK_COLORS = ["#E3A73A", "#8B93A0", "#B08D57"];

/** Ranked on points earned in the last 7 days (not all-time balance) —
 * keeps the board fresh week to week and matches My Progress's weekly
 * chart, which uses the same basis. */
export function Leaderboard({ entries }: LeaderboardProps) {
  const ranked = [...entries].sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  return (
    <>
      <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">Leaderboard</h1>
      <p className="text-[13px] text-muted-label -mt-2">Points earned this week</p>

      <div className="flex flex-col gap-2.5">
        {ranked.map((entry, i) => {
          const color = ACCENT_HEX[entry.member.accentColor];
          return (
            <div
              key={entry.member.id}
              className="bg-surface rounded-card p-4 shadow-sm shadow-black/5 flex items-center gap-3.5"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-bold font-display"
                style={{ background: RANK_COLORS[i] ?? "#E1E5EB" }}
              >
                {i === 0 ? <Trophy size={15} /> : i + 1}
              </div>
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold font-display shrink-0"
                style={{ background: color }}
              >
                {entry.member.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-ink">{entry.member.name}</p>
                {entry.points.currentStreak > 0 && (
                  <p className="text-[12px] text-accent-gold font-medium flex items-center gap-1">
                    <Flame size={11} className="fill-accent-gold" /> {entry.points.currentStreak}-day streak
                  </p>
                )}
              </div>
              <p className="text-[16px] font-semibold text-ink shrink-0">{entry.weeklyPoints} pts</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
