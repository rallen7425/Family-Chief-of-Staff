import { MultiDayAgenda } from "@/components/schedule/MultiDayAgenda";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface WeekViewProps {
  days: { date: Date; events: CalendarEvent[] }[];
  familyMembers: FamilyMember[];
}

export function WeekView({ days, familyMembers }: WeekViewProps) {
  return <MultiDayAgenda days={days} familyMembers={familyMembers} />;
}
