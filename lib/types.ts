export type AccentColor = "coral" | "teal" | "gold" | "berry";
export type SourceType = "manual" | "chat" | "email_scan" | "system";
export type ItemStatus = "pending_review" | "confirmed" | "dismissed";

/** The unified content model: one `entries` table, four kinds.
 * - event    — on the schedule, no checkbox ("Football practice")
 * - task     — on the todo list, has a checkbox ("Return signed forms")
 * - reminder — a sub-line under what it's about, or standalone on its own date
 * - advisory — on the schedule, visually distinct ("lane closure — allow extra time") */
export type EntryKind = "event" | "task" | "reminder" | "advisory";

export interface FamilyMember {
  id: string;
  name: string;
  accentColor: AccentColor;
  /** Drives computed event visibility (see lib/visibility.ts) — adults'
   * assigned events default to private-to-them, kids' don't. */
  isAdult: boolean;
}

export interface SourceDetail {
  message?: string;
  conversationId?: string;
  gmailMessageId?: string;
  threadId?: string;
  sender?: string;
  subject?: string;
  attachmentName?: string;
  attachmentPage?: number;
  extractedSnippet?: string;
  /** ISO datetime the source email was received (email_scan only). */
  receivedAt?: string;
  /** The connected Gmail mailbox this was scanned from (email_scan only). */
  googleAccountEmail?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  kind: EntryKind;
  familyMemberId: string | null;
  category?: string;
  startsAt: string; // ISO datetime
  endsAt?: string; // ISO datetime
  allDay: boolean;
  location?: string;
  notes?: string;
  status: ItemStatus;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
  /** Shared across every row generated from one recurring-event input (e.g.
   * "every Saturday until Dec 1"). Null for one-off events. */
  recurrenceId?: string;
  createdAt: string; // ISO datetime
}

export interface Todo {
  id: string;
  title: string;
  familyMemberId: string | null;
  dueDate?: string; // YYYY-MM-DD
  completed: boolean;
  status: ItemStatus;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
}

export interface KeepInMindItem {
  id: string;
  body: string;
  icon: "weather" | "reminder" | "package";
  familyMemberId?: string | null;
  dismissed: boolean;
}

export type ScheduleViewMode = "day" | "3day" | "week" | "month";
