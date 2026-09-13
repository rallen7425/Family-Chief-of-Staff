import { format } from "date-fns";
import { getTodaySchedulePreview, getLinkableOptions } from "@/lib/data/events";
import { getIncompleteTodos } from "@/lib/data/todos";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { getActivitiesByMember } from "@/lib/data/memberDetails";
import { getRankedNotifications } from "@/lib/notifications";
import { getActiveMember } from "@/lib/activeMember";
import { getRightNowChore } from "@/lib/rightNow";
import { KeepInMindCard } from "@/components/today/KeepInMindCard";
import { ScheduleCard } from "@/components/today/ScheduleCard";
import { NeedsDoingCard } from "@/components/today/NeedsDoingCard";
import { RightNowCard } from "@/components/today/RightNowCard";
import { EntryEditingProvider } from "@/components/entries/EntryEditingContext";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);

  const [
    notifications,
    schedulePreview,
    todos,
    arrivalRules,
    linkables,
    activitiesByMember,
  ] = await Promise.all([
    getRankedNotifications(),
    getTodaySchedulePreview(activeMember?.id),
    getIncompleteTodos(3),
    getArrivalBufferRules(),
    getLinkableOptions(),
    getActivitiesByMember(),
  ]);

  const rightNowChore = activeMember ? await getRightNowChore(activeMember) : null;

  return (
    <>
      <div>
        <p className="text-muted-text text-[13px] font-medium tracking-wide mb-1 uppercase">
          {format(new Date(), "EEE, MMM d")}
        </p>
        <h1 className="font-display font-semibold text-[32px] leading-tight text-ink">Today</h1>
      </div>
      {activeMember && <RightNowCard chore={rightNowChore} member={activeMember} />}
      <EntryEditingProvider
        arrivalRules={arrivalRules}
        linkables={linkables}
        activitiesByMember={activitiesByMember}
      >
        <KeepInMindCard notifications={notifications} familyMembers={familyMembers} />
        <ScheduleCard preview={schedulePreview} familyMembers={familyMembers} />
        <NeedsDoingCard todos={todos} familyMembers={familyMembers} />
      </EntryEditingProvider>
    </>
  );
}
