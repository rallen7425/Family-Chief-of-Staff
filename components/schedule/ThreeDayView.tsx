import { MultiDayAgenda } from "@/components/schedule/MultiDayAgenda";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

interface ThreeDayViewProps {
  days: { date: Date; events: CalendarEvent[] }[];
  familyMembers: FamilyMember[];
}

export function ThreeDayView({ days, familyMembers }: ThreeDayViewProps) {
  return <MultiDayAgenda days={days} familyMembers={familyMembers} />;
}
