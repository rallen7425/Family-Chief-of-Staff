import { format, subDays } from "date-fns";
import { Flame } from "lucide-react";
import { ACCENT_HEX } from "@/lib/colors";
import type { ChoreCompletion, FamilyMember, MemberPoints } from "@/lib/types";

interface MyProgressProps {
  member: FamilyMember;
  points: MemberPoints;
  /** All-time — used for lifetime badge thresholds (balance drops when
   * points are spent on a Goal, so it can't drive these). */
  completions: ChoreCompletion[];
}

interface Badge {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
}

export function MyProgress({ member, points, completions }: MyProgressProps) {
  const color = ACCENT_HEX[member.accentColor];
  const lifetimePoints = completions.reduce((sum, c) => sum + c.pointsAwarded, 0);

  const badges: Badge[] = [
    { id: "streak5", icon: "🔥", label: "5-Day Streak", earned: points.longestStreak >= 5 },
    { id: "streak10", icon: "🔥", label: "10-Day Streak", earned: points.longestStreak >= 10 },
    { id: "points100", icon: "⭐", label: "100 Points", earned: lifetimePoints >= 100 },
    { id: "points500", icon: "🌟", label: "500 Points", earned: lifetimePoints >= 500 },
    { id: "chores25", icon: "✅", label: "25 Chores Done", earned: completions.length >= 25 },
  ];

  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  const pointsByDay = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return completions.filter((c) => c.completedOn === key).reduce((sum, c) => sum + c.pointsAwarded, 0);
  });
  const maxPoints = Math.max(1, ...pointsByDay);

  const ringProgress = points.balance % 100;
  const level = Math.floor(points.balance / 100) + 1;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - ringProgress / 100);

  return (
    <>
      <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">My Progress</h1>

      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex items-center gap-6">
        <div className="relative w-[100px] h-[100px] shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E1E5EB" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[20px] font-display font-semibold text-ink">{level}</p>
            <p className="text-[10px] text-muted-label uppercase tracking-wide">Level</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-accent-gold fill-accent-gold" />
            <p className="text-[15px] font-semibold text-ink">{points.currentStreak}-day streak</p>
          </div>
          <p className="text-[15px] font-semibold text-ink">{points.balance} points</p>
          <p className="text-[12px] text-muted-label">Longest streak: {points.longestStreak} days</p>
        </div>
      </section>

      <section className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-4">This week</h2>
        <div className="flex items-end justify-between gap-2 h-24">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md min-h-[3px] transition-all"
                  style={{ height: `${(pointsByDay[i] / maxPoints) * 100}%`, background: color }}
                />
              </div>
              <span className="text-[10px] text-muted-label">{format(d, "EEEEE")}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`bg-surface rounded-card p-3.5 shadow-sm shadow-black/5 flex flex-col items-center text-center gap-1.5 ${
                badge.earned ? "" : "opacity-35 grayscale"
              }`}
            >
              <span className="text-[26px]">{badge.icon}</span>
              <p className="text-[11px] font-medium text-ink leading-tight">{badge.label}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
