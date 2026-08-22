export type AccentColor = "coral" | "teal" | "gold" | "berry";
export type SourceType = "manual" | "chat" | "email_scan" | "system";
export type ItemStatus = "pending_review" | "confirmed" | "dismissed";

export interface FamilyMember {
  id: string;
  name: string;
  accentColor: AccentColor;
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
}

export interface CalendarEvent {
  id: string;
  title: string;
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
