import { format } from "date-fns";
import { getActiveKeepInMindItems } from "@/lib/data/keepInMind";
import { getPendingReviewEvents, getTodayScheduleEvents } from "@/lib/data/events";
import { getIncompleteTodos, getUrgentTodos, getPendingReviewTodos } from "@/lib/data/todos";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { KeepInMindCard } from "@/components/today/KeepInMindCard";
import { ScheduleCard } from "@/components/today/ScheduleCard";
import { NeedsDoingCard } from "@/components/today/NeedsDoingCard";
import { EntryEditingProvider } from "@/components/entries/EntryEditingContext";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [
    keepInMind,
    urgentTodos,
    pendingReviewEvents,
    pendingReviewTodos,
    todayEvents,
    todos,
    familyMembers,
    arrivalRules,
  ] = await Promise.all([
    getActiveKeepInMindItems(),
    getUrgentTodos(),
    getPendingReviewEvents(),
    getPendingReviewTodos(),
    getTodayScheduleEvents(3),
    getIncompleteTodos(3),
    getFamilyMembers(),
    getArrivalBufferRules(),
  ]);

  return (
    <>
      <div>
        <p className="text-muted-text text-[13px] font-medium tracking-wide mb-1 uppercase">
          {format(new Date(), "EEE, MMM d")}
        </p>
        <h1 className="font-display font-semibold text-[32px] leading-tight text-ink">Today</h1>
      </div>
      <KeepInMindCard
        items={keepInMind}
        urgentTodos={urgentTodos}
        pendingReviewCount={pendingReviewEvents.length + pendingReviewTodos.length}
      />
      <EntryEditingProvider arrivalRules={arrivalRules}>
        <ScheduleCard events={todayEvents} familyMembers={familyMembers} />
      </EntryEditingProvider>
      <NeedsDoingCard todos={todos} familyMembers={familyMembers} />
    </>
  );
}
