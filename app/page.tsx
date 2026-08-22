import { format } from "date-fns";
import { getActiveKeepInMindItems } from "@/lib/data/keepInMind";
import { getPendingReviewEvents, getUpcomingEvents } from "@/lib/data/events";
import { getIncompleteTodos } from "@/lib/data/todos";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { KeepInMindCard } from "@/components/today/KeepInMindCard";
import { ScheduleCard } from "@/components/today/ScheduleCard";
import { NeedsDoingCard } from "@/components/today/NeedsDoingCard";

export default async function TodayPage() {
  const [keepInMind, pendingReview, upcomingEvents, todos, familyMembers] = await Promise.all([
    getActiveKeepInMindItems(),
    getPendingReviewEvents(),
    getUpcomingEvents(3),
    getIncompleteTodos(3),
    getFamilyMembers(),
  ]);

  return (
    <>
      <div>
        <p className="text-muted-text text-[13px] font-medium tracking-wide mb-1 uppercase">
          {format(new Date(), "EEE, MMM d")}
        </p>
        <h1 className="font-display font-semibold text-[32px] leading-tight text-ink">Today</h1>
      </div>
      <KeepInMindCard items={keepInMind} pendingReviewEvents={pendingReview} />
      <ScheduleCard events={upcomingEvents} familyMembers={familyMembers} />
      <NeedsDoingCard todos={todos} familyMembers={familyMembers} />
    </>
  );
}
