export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface EventDraftPayload {
  kind: "event";
  title: string;
  familyMemberId: string | null;
  familyMemberName: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, or "" for all-day
  location: string;
  notes: string;
}

export interface TodoDraftPayload {
  kind: "todo";
  title: string;
  familyMemberId: string | null;
  familyMemberName: string | null;
  dueDate: string; // YYYY-MM-DD, or ""
}

export type ChatDraft = EventDraftPayload | TodoDraftPayload;

export interface ChatApiResponse {
  reply?: string;
  draft?: ChatDraft;
  error?: string;
}
