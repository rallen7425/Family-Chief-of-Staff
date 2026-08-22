import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import type { CalendarEvent, FamilyMember, KeepInMindItem, Todo } from "@/lib/types";

/**
 * Phase 1 in-memory seed data. Shaped to match the planned `rufus` Postgres
 * schema (see docs/design/IMPLEMENTATION-PLAN.md) so lib/data/*.ts can swap
 * this out for real Supabase queries in Phase 3 without changing call sites.
 */

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: "rick", name: "Rick", accentColor: "coral" },
  { id: "kim", name: "Kim", accentColor: "teal" },
  { id: "ben", name: "Ben", accentColor: "gold" },
  { id: "nora", name: "Nora", accentColor: "berry" },
];

function at(dayOffset: number, hour: number, minute = 0) {
  return setMinutes(setHours(startOfDay(addDays(new Date(), dayOffset)), hour), minute).toISOString();
}

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Pickup — Ben, soccer practice",
    familyMemberId: "ben",
    category: "sports",
    startsAt: at(0, 15, 15),
    endsAt: at(0, 16, 0),
    allDay: false,
    location: "Riverside Fields",
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-2",
    title: "Dentist — Rick",
    familyMemberId: "rick",
    category: "medical",
    startsAt: at(0, 16, 0),
    endsAt: at(0, 16, 40),
    allDay: false,
    location: "Dr. Kessler",
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-3",
    title: "Dance — Nora",
    familyMemberId: "nora",
    category: "activity",
    startsAt: at(0, 17, 30),
    endsAt: at(0, 18, 30),
    allDay: false,
    location: "Fields close at 7",
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-4",
    title: "Parent-teacher conference — Kim",
    familyMemberId: "kim",
    category: "school",
    startsAt: at(1, 9, 0),
    endsAt: at(1, 9, 30),
    allDay: false,
    location: "Lincoln Elementary",
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-5",
    title: "Varsity/JV Football — Ben",
    familyMemberId: "ben",
    category: "sports",
    startsAt: at(2, 8, 45),
    endsAt: at(2, 12, 0),
    allDay: false,
    location: "St. John's Prep",
    notes: "Boys should arrive by 8:45, done by noon.",
    status: "pending_review",
    sourceType: "email_scan",
    sourceDetail: {
      sender: "bstpierre@stjohnsprep.org",
      subject: "Varsity/JV Football — 2026 Preseason Schedule",
      attachmentName: "2026 Preseason Schedule.docx",
      extractedSnippet: "boys should arrive for 845 and we should be done by noon",
    },
  },
  {
    id: "evt-6",
    title: "Family dinner — Grandma's",
    familyMemberId: null,
    category: "social",
    startsAt: at(3, 18, 0),
    endsAt: at(3, 20, 0),
    allDay: false,
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-7",
    title: "Dance recital — Nora",
    familyMemberId: "nora",
    category: "activity",
    startsAt: at(4, 15, 0),
    endsAt: at(4, 17, 0),
    allDay: false,
    location: "Riverside Studio",
    status: "confirmed",
    sourceType: "chat",
    sourceDetail: { message: "Nora has a dance recital Friday at 3 at Riverside Studio" },
  },
  {
    id: "evt-8",
    title: "Soccer tournament — Ben",
    familyMemberId: "ben",
    category: "sports",
    startsAt: at(6, 8, 0),
    endsAt: at(6, 14, 0),
    allDay: false,
    location: "County Sports Complex",
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-9",
    title: "Rick's birthday",
    familyMemberId: "rick",
    category: "social",
    startsAt: at(9, 0, 0),
    allDay: true,
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "evt-10",
    title: "Piano lesson — Ben",
    familyMemberId: "ben",
    category: "activity",
    startsAt: at(-1, 16, 0),
    endsAt: at(-1, 16, 30),
    allDay: false,
    status: "confirmed",
    sourceType: "manual",
  },
];

export const MOCK_TODOS: Todo[] = [
  {
    id: "todo-1",
    title: "Order Ben's cleats",
    familyMemberId: "ben",
    dueDate: undefined,
    completed: false,
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "todo-2",
    title: "Sign field trip form",
    familyMemberId: "nora",
    completed: false,
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "todo-3",
    title: "Refill Kim's prescription",
    familyMemberId: "kim",
    completed: true,
    status: "confirmed",
    sourceType: "manual",
  },
  {
    id: "todo-4",
    title: "Permission slip due Monday",
    familyMemberId: "ben",
    dueDate: startOfDay(addDays(new Date(), 1)).toISOString().slice(0, 10),
    completed: false,
    status: "pending_review",
    sourceType: "email_scan",
    sourceDetail: {
      sender: "bstpierre@stjohnsprep.org",
      subject: "Varsity/JV Football — 2026 Preseason Schedule",
      extractedSnippet: "please return the signed permission slip before the first game",
    },
  },
];

export const MOCK_KEEP_IN_MIND: KeepInMindItem[] = [
  {
    id: "kim-1",
    body: "Rain after 3 — soccer pickup may move indoors",
    icon: "weather",
    dismissed: false,
  },
  {
    id: "kim-2",
    body: "Ben's permission slip is due Monday",
    icon: "reminder",
    familyMemberId: "ben",
    dismissed: false,
  },
  {
    id: "kim-3",
    body: "Nora's teacher gift still needs wrapping",
    icon: "package",
    familyMemberId: "nora",
    dismissed: false,
  },
];
