import type Anthropic from "@anthropic-ai/sdk";
import { addDays, format, startOfDay } from "date-fns";
import { getEventsInRange } from "@/lib/data/events";
import { getTodos } from "@/lib/data/todos";
import { parseDateParam } from "@/lib/dateParam";
import type { FamilyMember, SourceDetail, SourceType } from "@/lib/types";
import type { ChatDraft } from "@/lib/chat/types";

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_schedule",
    description:
      "Search the family's events and todos. Call this whenever the user asks about upcoming events, todos, or a question like 'when is X' or 'what does Y have going on'. Returns matches including where the information originally came from, so you can cite it in your answer.",
    input_schema: {
      type: "object",
      properties: {
        person_name: {
          type: "string",
          description: "Filter to one family member by first name, e.g. 'Ben'. Omit to search everyone.",
        },
        keyword: {
          type: "string",
          description: "Filter by a keyword in the title, e.g. 'soccer'. Omit to skip keyword filtering.",
        },
        start_date: {
          type: "string",
          description: "ISO date (YYYY-MM-DD) to start the search range. Defaults to today if omitted.",
        },
        end_date: {
          type: "string",
          description: "ISO date (YYYY-MM-DD) to end the search range, inclusive. Defaults to 90 days after start_date if omitted.",
        },
        include_todos: {
          type: "boolean",
          description: "Whether to also search todos, not just events. Defaults to true.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_event_draft",
    description:
      "Propose a new calendar event from something the user described in natural language, e.g. 'Ben has a soccer game Friday at 3 at the middle school'. This does NOT save the event — it only returns a draft for the user to review and confirm in the app UI.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "A short title for the event, e.g. 'Soccer game'." },
        person_name: {
          type: "string",
          description: "The family member's first name this event is for, if mentioned. Omit for a whole-family event.",
        },
        date: { type: "string", description: "ISO date (YYYY-MM-DD) the event occurs on." },
        time: {
          type: "string",
          description: "24-hour time (HH:mm) the event starts, if a specific time was mentioned. Omit for an all-day event.",
        },
        location: { type: "string", description: "Where the event takes place, if mentioned." },
        notes: { type: "string", description: "Any other relevant detail mentioned." },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "create_todo_draft",
    description:
      "Propose a new todo from something the user described in natural language, e.g. 'remind me to sign Nora's field trip form'. This does NOT save the todo — it only returns a draft for the user to review and confirm in the app UI.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "A short title for the todo." },
        person_name: {
          type: "string",
          description: "The family member's first name this todo is for, if mentioned. Omit for a whole-family todo.",
        },
        due_date: { type: "string", description: "ISO date (YYYY-MM-DD) the todo is due, if mentioned." },
      },
      required: ["title"],
    },
  },
];

function resolveFamilyMember(name: string | undefined, familyMembers: FamilyMember[]): FamilyMember | undefined {
  if (!name) return undefined;
  return familyMembers.find((member) => member.name.toLowerCase() === name.toLowerCase());
}

function describeSource(sourceType: SourceType, detail?: SourceDetail): string | null {
  if (sourceType === "email_scan" && detail?.sender) {
    return `email from ${detail.sender}${detail.subject ? ` ("${detail.subject}")` : ""}`;
  }
  if (sourceType === "chat") return "added via chat";
  return null;
}

interface QueryScheduleInput {
  person_name?: string;
  keyword?: string;
  start_date?: string;
  end_date?: string;
  include_todos?: boolean;
}

export async function executeQuerySchedule(rawInput: unknown, familyMembers: FamilyMember[]) {
  const input = rawInput as QueryScheduleInput;
  const start = input.start_date ? startOfDay(parseDateParam(input.start_date)) : startOfDay(new Date());
  const end = input.end_date ? addDays(startOfDay(parseDateParam(input.end_date)), 1) : addDays(start, 90);
  const person = resolveFamilyMember(input.person_name, familyMembers);
  const personId = person?.id ?? "all";
  const keyword = input.keyword?.toLowerCase();

  let events = await getEventsInRange(start, end, personId);
  if (keyword) events = events.filter((event) => event.title.toLowerCase().includes(keyword));

  let todos: Awaited<ReturnType<typeof getTodos>> = [];
  if (input.include_todos !== false) {
    todos = await getTodos(personId);
    if (keyword) todos = todos.filter((todo) => todo.title.toLowerCase().includes(keyword));
  }

  return {
    events: events.map((event) => ({
      title: event.title,
      person: familyMembers.find((m) => m.id === event.familyMemberId)?.name ?? null,
      // Pre-formatted in the server's local time — pass this string through
      // as-is rather than re-deriving a time from ISO, which reads as UTC
      // clock digits with no conversion and reports the wrong hour.
      when: event.allDay
        ? format(new Date(event.startsAt), "EEEE, MMMM d, yyyy") + " (all day)"
        : format(new Date(event.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a"),
      location: event.location ?? null,
      status: event.status,
      source: describeSource(event.sourceType, event.sourceDetail),
    })),
    todos: todos.map((todo) => ({
      title: todo.title,
      person: familyMembers.find((m) => m.id === todo.familyMemberId)?.name ?? null,
      due_date: todo.dueDate ?? null,
      completed: todo.completed,
      status: todo.status,
      source: describeSource(todo.sourceType, todo.sourceDetail),
    })),
  };
}

export function buildDraftFromToolUse(
  tool: Anthropic.ToolUseBlock,
  familyMembers: FamilyMember[]
): ChatDraft {
  if (tool.name === "create_todo_draft") {
    const input = tool.input as { title: string; person_name?: string; due_date?: string };
    const member = resolveFamilyMember(input.person_name, familyMembers);
    return {
      kind: "todo",
      title: input.title,
      familyMemberId: member?.id ?? null,
      familyMemberName: member?.name ?? input.person_name ?? null,
      dueDate: input.due_date ?? "",
    };
  }

  const input = tool.input as {
    title: string;
    person_name?: string;
    date: string;
    time?: string;
    location?: string;
    notes?: string;
  };
  const member = resolveFamilyMember(input.person_name, familyMembers);
  return {
    kind: "event",
    title: input.title,
    familyMemberId: member?.id ?? null,
    familyMemberName: member?.name ?? input.person_name ?? null,
    date: input.date,
    time: input.time ?? "",
    location: input.location ?? "",
    notes: input.notes ?? "",
  };
}
