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
  category: string; // one of the fixed vocab, or ""
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, or "" for all-day
  endTime: string; // HH:mm, or ""
  arrivalTime: string; // HH:mm stated "report by", or ""
  location: string;
  notes: string;
  /** YYYY-MM-DD, or "" for a one-off event. Set only once the user has said
   * how long a recurring pattern ("every Saturday") should run — the model
   * is instructed to ask rather than guess when that's still unknown. */
  recurrenceUntil: string;
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
