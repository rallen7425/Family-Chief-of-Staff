import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { getEventsInRange, getLinkableEntries } from "@/lib/data/events";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { parseDateParam, formatDateParam } from "@/lib/dateParam";
import type { CalendarEvent, ScheduleViewMode } from "@/lib/types";
import { ViewModeSwitcher } from "@/components/schedule/ViewModeSwitcher";
import { DateNav, formatRangeLabel } from "@/components/schedule/DateNav";
import { PersonFilter } from "@/components/shared/PersonFilter";
import { DayView } from "@/components/schedule/DayView";
import { ThreeDayView } from "@/components/schedule/ThreeDayView";
import { WeekView } from "@/components/schedule/WeekView";
import { MonthView } from "@/components/schedule/MonthView";
import { AddEntryDialog } from "@/components/entries/AddEntryDialog";
import { EntryEditingProvider } from "@/components/entries/EntryEditingContext";

const VALID_VIEWS: ScheduleViewMode[] = ["day", "3day", "week", "month"];

function bucketByDay(days: Date[], events: CalendarEvent[]) {
  return days.map((date) => ({
    date,
    events: events
      .filter((event) => isSameDay(new Date(event.startsAt), date))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
  }));
}

export default async function SchedulePage(props: PageProps<"/schedule">) {
  const searchParams = await props.searchParams;
  const rawView = typeof searchParams.view === "string" ? searchParams.view : "day";
  const view: ScheduleViewMode = VALID_VIEWS.includes(rawView as ScheduleViewMode)
    ? (rawView as ScheduleViewMode)
    : "day";
  const person = typeof searchParams.person === "string" ? searchParams.person : "all";
  const date = parseDateParam(typeof searchParams.date === "string" ? searchParams.date : undefined);

  const [familyMembers, arrivalRules, linkables] = await Promise.all([
    getFamilyMembers(),
    getArrivalBufferRules(),
    getLinkableEntries(),
  ]);
  const linkableOptions = linkables.map((e) => ({
    id: e.id,
    title: e.title,
    when: e.allDay ? format(new Date(e.startsAt), "MMM d") : format(new Date(e.startsAt), "MMM d, h:mm a"),
  }));

  function buildHref(overrides: { view?: ScheduleViewMode; date?: Date; person?: string }) {
    const params = new URLSearchParams({
      view: overrides.view ?? view,
      date: formatDateParam(overrides.date ?? date),
      person: overrides.person ?? person,
    });
    return `/schedule?${params.toString()}`;
  }

  let rangeStart: Date;
  let rangeEnd: Date; // exclusive
  let labelEnd: Date;

  if (view === "day") {
    rangeStart = startOfDay(date);
    rangeEnd = addDays(rangeStart, 1);
    labelEnd = rangeStart;
  } else if (view === "3day") {
    rangeStart = startOfDay(date);
    rangeEnd = addDays(rangeStart, 3);
    labelEnd = addDays(rangeStart, 2);
  } else if (view === "week") {
    rangeStart = startOfWeek(startOfDay(date));
    rangeEnd = addDays(rangeStart, 7);
    labelEnd = addDays(rangeStart, 6);
  } else {
    const monthStart = startOfMonth(date);
    rangeStart = startOfWeek(monthStart);
    rangeEnd = addDays(endOfWeek(endOfMonth(date)), 1);
    labelEnd = endOfMonth(date);
  }

  const events = await getEventsInRange(rangeStart, rangeEnd, person);

  let prevDate: Date;
  let nextDate: Date;
  if (view === "day") {
    prevDate = subDays(date, 1);
    nextDate = addDays(date, 1);
  } else if (view === "3day") {
    prevDate = subDays(date, 3);
    nextDate = addDays(date, 3);
  } else if (view === "week") {
    prevDate = subDays(date, 7);
    nextDate = addDays(date, 7);
  } else {
    prevDate = subMonths(date, 1);
    nextDate = addMonths(date, 1);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Schedule</h1>
        <AddEntryDialog
          familyMembers={familyMembers}
          arrivalRules={arrivalRules}
          linkables={linkableOptions}
          defaultKind="event"
          label="Add event"
        />
      </div>

      <ViewModeSwitcher active={view} buildHref={(v) => buildHref({ view: v })} />

      <DateNav
        date={date}
        viewMode={view}
        label={formatRangeLabel(view === "month" ? date : rangeStart, labelEnd, view)}
        prevHref={buildHref({ date: prevDate })}
        nextHref={buildHref({ date: nextDate })}
        todayHref={buildHref({ date: new Date() })}
      />

      <PersonFilter
        familyMembers={familyMembers}
        selectedPersonId={person}
        buildHref={(personId) => buildHref({ person: personId })}
      />

      <EntryEditingProvider arrivalRules={arrivalRules} linkables={linkableOptions}>
        {view === "day" && <DayView date={date} events={events} familyMembers={familyMembers} />}
        {view === "3day" && (
          <ThreeDayView
            days={bucketByDay(eachDayOfInterval({ start: rangeStart, end: addDays(rangeEnd, -1) }), events)}
            familyMembers={familyMembers}
          />
        )}
        {view === "week" && (
          <WeekView
            days={bucketByDay(eachDayOfInterval({ start: rangeStart, end: addDays(rangeEnd, -1) }), events)}
            familyMembers={familyMembers}
          />
        )}
        {view === "month" && (
          <MonthView
            month={date}
            events={events}
            familyMembers={familyMembers}
            buildDayHref={(d) => buildHref({ view: "day", date: d })}
          />
        )}
      </EntryEditingProvider>
    </>
  );
}
