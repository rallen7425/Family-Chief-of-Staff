/** Person colour. The first four are the original brand accents (existing
 * members use them); the rest were added with Profile & Family Management.
 * Hex + display names live in `lib/colors.ts` (`ACCENT_HEX` / `ACCENT_NAME`)
 * — rendered inline, not as Tailwind classes. */
export type AccentColor =
  | "coral"
  | "teal"
  | "gold"
  | "berry"
  | "blue"
  | "navyBlue"
  | "lightBlue"
  | "green"
  | "lightGreen"
  | "yellow"
  | "purple"
  | "pink"
  | "fuchsia"
  | "maroon"
  | "brown"
  | "grey"
  | "black"
  | "red";
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
   * assigned events default to private-to-them, kids' don't. Recomputed
   * from `birthday` on every write (see lib/family.ts `computeIsAdult`). */
  isAdult: boolean;
  /** Free text, e.g. "Dad", "Step-Mom", "Guardian". */
  relationship?: string;
  isHeadOfHousehold: boolean;
  /** YYYY-MM-DD. */
  birthday?: string;
  email?: string;
  phone?: string;
  /** Shown on Edit Member for computed children only. */
  school?: string;
  grade?: string;
}

/** Display-only view of an `email_connections` row — never carries a token,
 * encrypted or otherwise. See lib/data/emailConnections.ts. */
export interface EmailConnectionSummary {
  id: string;
  familyMemberId: string;
  provider: "google" | "microsoft";
  externalAccountEmail: string;
  status: "active" | "paused" | "needs_reconnect" | "disconnected";
  emailEnabled: boolean;
  calendarEnabled: boolean;
  lastSyncedAt?: string;
  lastError?: string;
  connectedAt: string;
}

/** A structured secondary-profile item (activity / team / coach). */
export interface MemberDetail {
  id: string;
  familyMemberId: string;
  label: string;
  value: string;
  /** Expandable sub-rows: coach contact, location, schedule, etc. */
  fields: { label: string; value: string }[];
  /** Soft-hidden from downstream logic, still shown (struck through). */
  ignored: boolean;
  source: "manual" | "detected" | "voice";
  /** "Arrive N minutes early" for entries bound to this activity. Null =
   * fall back to the category rule / general default. 0–180. */
  arrivalBufferMinutes?: number | null;
  /** game | practice | rehearsal | appointment | other. */
  category?: string | null;
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
  /** @deprecated use `provider` + `accountEmail` — kept for rows written
   * before the multi-provider connector rework so old entries keep
   * rendering their existing provenance. */
  googleAccountEmail?: string;
  /** Which provider/connection this was scanned from (email_scan only,
   * post-connector-rework rows). */
  provider?: "google" | "microsoft";
  accountEmail?: string;
  connectionId?: string;
  /** Other emails found to describe this same real-world entry and folded
   * into this row by cross-email dedupe (email_scan only). */
  mergedSources?: {
    gmailMessageId?: string;
    subject?: string;
    sender?: string;
    extractedSnippet?: string;
  }[];
}

export type BusyStatus = "busy" | "free";
export type EntryScope = "personal" | "family";
export type ArrivalSource = "stated" | "inferred" | "manual";

/** A schedule-facing entry — kind `event`, `advisory`, or `reminder`.
 * (`familyMemberId` is the Subject; kept under the old name so the
 * visibility rule and calendar components don't churn.) */
export interface CalendarEvent {
  id: string;
  title: string;
  kind: EntryKind;
  familyMemberId: string | null;
  ownerMemberIds: string[];
  scope: EntryScope;
  busyStatus: BusyStatus;
  category?: string;
  startsAt: string; // ISO datetime
  endsAt?: string; // ISO datetime
  /** Set for kind `task` (this shape is reused for the review queue, which
   * mixes all four kinds). YYYY-MM-DD. */
  dueDate?: string;
  allDay: boolean;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  arrivalAt?: string; // ISO datetime
  arrivalSource?: ArrivalSource;
  /** Forces any notification derived from this entry to "critical" severity.
   * Set by the email-scan extractor or the entry form's Critical toggle. */
  isCritical: boolean;
  status: ItemStatus;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
  /** Shared across every row generated from one recurring-event input (e.g.
   * "every Saturday until Dec 1"). Null for one-off events. */
  recurrenceId?: string;
  recurrenceUntil?: string; // YYYY-MM-DD
  /** Set on a reminder: the event/task it's attached to. Null = standalone. */
  linkedEntryId?: string | null;
  /** The subject member's activity (member_details row) this entry belongs
   * to — drives the per-activity arrival buffer. Null = none. */
  memberDetailId?: string | null;
  /** Reminders linked to this entry, attached for schedule rendering. */
  reminders?: CalendarEvent[];
  createdAt: string; // ISO datetime
}

/** A todo-list-facing entry — kind `task`. */
export interface Todo {
  id: string;
  title: string;
  familyMemberId: string | null;
  ownerMemberIds: string[];
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  completed: boolean;
  isCritical: boolean;
  status: ItemStatus;
  sourceType: SourceType;
  sourceDetail?: SourceDetail;
}

/** Superset input for creating or updating any kind of entry (EntryForm
 * plus the createEntry / updateEntry actions). Times are pre-resolved to
 * ISO instants by the client (browser TZ) or the pipeline (household TZ). */
export interface EntryInput {
  kind: EntryKind;
  title: string;
  subjectMemberId: string | null;
  ownerMemberIds: string[];
  scope: EntryScope;
  busyStatus: BusyStatus;
  isCritical: boolean;
  category?: string | null;
  notes?: string | null;
  location?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  dueAt?: string | null; // YYYY-MM-DD
  allDay: boolean;
  arrivalAt?: string | null;
  arrivalSource?: ArrivalSource | null;
  linkedEntryId?: string | null;
  memberDetailId?: string | null;
  recurrence?: {
    localDate: string;
    localStartTime?: string;
    localEndTime?: string;
    untilDate: string;
  } | null;
}

export interface KeepInMindItem {
  id: string;
  body: string;
  icon: "weather" | "reminder" | "package";
  familyMemberId?: string | null;
  dismissed: boolean;
}

export type ScheduleViewMode = "day" | "3day" | "week" | "month";

// ── Gamified chore list ─────────────────────────────────────────────────

export type ChoreFrequency = "one_time" | "daily" | "weekly" | "custom";
export type ChoreTimeWindow = "before_school" | "after_school" | "evening" | "anytime";

export interface Chore {
  id: string;
  title: string;
  points: number;
  frequency: ChoreFrequency;
  /** weekly/custom only: 0=Sun..6=Sat. */
  frequencyDays?: number[] | null;
  /** "HH:MM" household-local, optional. */
  deadlineTime?: string | null;
  timeWindow: ChoreTimeWindow;
  /** Wins the Right Now tie-break when more than one chore is eligible. */
  isPinned: boolean;
  active: boolean;
  assigneeMemberIds: string[];
  createdAt: string;
}

export interface ChoreCompletion {
  id: string;
  choreId: string;
  familyMemberId: string;
  /** YYYY-MM-DD — the occurrence date, for recurring chores. */
  completedOn: string;
  status: "complete" | "partial";
  /** Stored per-row so a later change to the chore's point value doesn't
   * rewrite history. */
  pointsAwarded: number;
  completedAt: string;
}

/** Maintained balance/streak cache — one row per member, updated
 * transactionally alongside chore_completions/goal_claims writes. */
export interface MemberPoints {
  familyMemberId: string;
  balance: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedOn?: string | null;
}

export interface Goal {
  id: string;
  name: string;
  pointsNeeded: number;
  /** A parent must mark a claim "achieved" before it counts — since they
   * have to actually deliver it. False = counted the instant it's claimed. */
  needsApproval: boolean;
  active: boolean;
  /** Empty = available to every kid. */
  availableMemberIds: string[];
  createdAt: string;
}

export interface GoalClaim {
  id: string;
  goalId: string;
  familyMemberId: string;
  /** Debited from the member's balance at claim time, not at approval. */
  pointsSpent: number;
  status: "pending" | "achieved" | "denied";
  requestedAt: string;
  resolvedAt?: string | null;
}

/** The single Right Now card's contents — see lib/rightNow.ts. */
export interface RightNowChore {
  choreId: string;
  title: string;
  points: number;
  timeWindow: ChoreTimeWindow;
  deadlineTime?: string | null;
}
