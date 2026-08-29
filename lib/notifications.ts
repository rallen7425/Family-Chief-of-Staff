import { cache } from "react";
import { endOfDay, format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { getActionsSoon, getActiveAdvisories, getPendingReviewEvents } from "@/lib/data/events";
import { getPendingReviewTodos, getUrgentTodos } from "@/lib/data/todos";
import { getActiveKeepInMindItems } from "@/lib/data/keepInMind";
import { getNotificationDismissals } from "@/lib/data/notifications";
import type { CalendarEvent, KeepInMindItem, Todo } from "@/lib/types";

/**
 * The notification model. Nothing is stored — a `Notification` is derived at
 * request time from entries / todos / advisories / keep-in-mind items. A
 * thing qualifies when it is at least one of: new info the user wouldn't
 * otherwise have (advisories, time-bound ~24h from detection); something to
 * act on soon (next 6h); or flagged critical.
 *
 * `/notifications` renders three groups — Review (pinned), Important (the top
 * `IMPORTANT_LIMIT`), More (the rest) — and the Today tile mirrors the first
 * two.
 */
export type NotificationKind = "review" | "advisory" | "action-soon" | "deadline" | "system";
export type NotificationSeverity = "critical" | "high" | "normal";

export interface Notification {
  /** Stable across renders/days so dismissals stick: "review",
   * "advisory:<id>", "soon:<id>", "todo:<id>", "kim:<id>". */
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  detail?: string;
  /** Omitted for rows that don't navigate (system notes expand in place). */
  href?: string;
  /** Epoch ms — ranking sort key (how soon / how recent). */
  at: number;
  /** Epoch ms — hidden once `now` passes this. */
  expiresAt: number;
  /** Review + advisories are never individually dismissed. */
  dismissible: boolean;
}

export const IMPORTANT_LIMIT = 3;
export const ACTION_WINDOW_HOURS = 6;
const ADVISORY_TTL_MS = 24 * 60 * 60 * 1000;
const FAR_FUTURE = Number.MAX_SAFE_INTEGER;

const HOUSEHOLD_TIMEZONE = process.env.HOUSEHOLD_TIMEZONE || "America/New_York";
function householdDay(d: Date): string {
  return format(new TZDate(d.getTime(), HOUSEHOLD_TIMEZONE), "yyyy-MM-dd");
}
function householdTime(iso: string): string {
  return format(new TZDate(new Date(iso).getTime(), HOUSEHOLD_TIMEZONE), "h:mm a");
}
function dayHref(iso: string): string {
  return `/schedule?view=day&date=${householdDay(new Date(iso))}`;
}

// ── builders (pure) ─────────────────────────────────────────────────────────

export function buildReviewNudge(pendingCount: number, now: Date): Notification | null {
  if (pendingCount <= 0) return null;
  return {
    id: "review",
    kind: "review",
    severity: "high",
    title: `${pendingCount} new ${pendingCount === 1 ? "entry needs" : "entries need"} review`,
    detail: "Auto-detected from email — tap to approve or dismiss",
    href: "/review",
    at: now.getTime(),
    expiresAt: FAR_FUTURE,
    dismissible: false,
  };
}

export function buildAdvisoryNotification(a: CalendarEvent, now: Date): Notification | null {
  const created = new Date(a.createdAt).getTime();
  const applicableStart = new Date(a.startsAt).getTime();
  const applicableEnd = endOfDay(new Date(a.endsAt ?? a.startsAt)).getTime();
  const expiresAt = Math.max(created + ADVISORY_TTL_MS, applicableEnd);
  if (now.getTime() >= expiresAt) return null;
  return {
    id: `advisory:${a.id}`,
    kind: "advisory",
    severity: a.isCritical ? "critical" : "high",
    title: a.title,
    detail: a.location,
    href: dayHref(a.startsAt),
    // Rank on when the advisory *applies*, not when it was detected — an
    // advisory for a future day sits mid-pack; one already in effect gets
    // the same urgency bump as anything else happening now.
    at: applicableStart,
    expiresAt,
    dismissible: false,
  };
}

export function buildActionSoonNotification(e: CalendarEvent): Notification {
  const trigger = new Date(e.arrivalAt ?? e.startsAt).getTime();
  const mustBeSomewhere = e.busyStatus === "busy" && Boolean(e.location || e.arrivalAt);
  const when = e.arrivalAt
    ? `Leave by ${householdTime(e.arrivalAt)}`
    : `Starts ${householdTime(e.startsAt)}`;
  return {
    id: `soon:${e.id}`,
    kind: "action-soon",
    severity: e.isCritical || mustBeSomewhere ? "critical" : "high",
    title: e.title,
    detail: [when, e.location].filter(Boolean).join(" · "),
    href: dayHref(e.startsAt),
    at: trigger,
    expiresAt: new Date(e.endsAt ?? e.startsAt).getTime(),
    dismissible: true,
  };
}

export function buildDeadlineNotification(t: Todo, now: Date): Notification {
  const today = householdDay(now);
  const overdue = Boolean(t.dueDate && t.dueDate < today);
  return {
    id: `todo:${t.id}`,
    kind: "deadline",
    severity: t.isCritical ? "critical" : overdue ? "high" : "normal",
    title: t.title,
    detail: t.dueDate
      ? overdue
        ? `Overdue — was due ${format(new Date(`${t.dueDate}T00:00:00`), "EEE, MMM d")}`
        : "Due today"
      : undefined,
    href: "/todo",
    at: t.dueDate ? new Date(`${t.dueDate}T00:00:00`).getTime() : now.getTime(),
    expiresAt: FAR_FUTURE, // stays until the task is completed (which removes it from the source)
    dismissible: true,
  };
}

export function buildSystemNotification(item: KeepInMindItem, now: Date): Notification {
  return {
    id: `kim:${item.id}`,
    kind: "system",
    severity: "normal",
    title: item.body,
    at: now.getTime(),
    expiresAt: FAR_FUTURE,
    dismissible: true,
  };
}

// ── ranking (pure) ─────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<NotificationSeverity, number> = { critical: 300, high: 200, normal: 100 };
const KIND_TIEBREAK: Record<NotificationKind, number> = {
  "action-soon": 3,
  advisory: 2,
  deadline: 1,
  system: 0,
  review: 0,
};

/** 0–100, larger the closer `at` is to `now` (or already past). */
function urgencyBonus(at: number, now: number): number {
  const horizon = ACTION_WINDOW_HOURS * 60 * 60 * 1000;
  const delta = at - now;
  if (delta <= 0) return 100;
  if (delta >= horizon) return 0;
  return Math.round((1 - delta / horizon) * 100);
}

function score(n: Notification, now: number): number {
  return SEVERITY_WEIGHT[n.severity] + urgencyBonus(n.at, now) + KIND_TIEBREAK[n.kind];
}

export function rankNotifications(list: Notification[], now: Date): Notification[] {
  const t = now.getTime();
  return [...list].sort((a, b) => score(b, t) - score(a, t) || a.at - b.at);
}

// ── assembly (pure) ────────────────────────────────────────────────────────

export interface NotificationSources {
  pendingCount: number;
  advisories: CalendarEvent[];
  actionsSoon: CalendarEvent[];
  urgentTodos: Todo[];
  systemItems: KeepInMindItem[];
  dismissed: Set<string>;
}

export interface RankedNotifications {
  reviewNudge: Notification | null;
  important: Notification[];
  more: Notification[];
  /** Everything shown, for the count badge (review row included). */
  total: number;
}

export function assembleNotifications(sources: NotificationSources, now: Date): RankedNotifications {
  const reviewNudge = buildReviewNudge(sources.pendingCount, now);

  const raw: Notification[] = [
    ...sources.advisories
      .map((a) => buildAdvisoryNotification(a, now))
      .filter((n): n is Notification => n !== null),
    ...sources.actionsSoon.map((e) => buildActionSoonNotification(e)),
    ...sources.urgentTodos.map((t) => buildDeadlineNotification(t, now)),
    ...sources.systemItems.map((i) => buildSystemNotification(i, now)),
  ];

  const visible = raw.filter(
    (n) => n.expiresAt > now.getTime() && !(n.dismissible && sources.dismissed.has(n.id))
  );
  const ranked = rankNotifications(visible, now);

  return {
    reviewNudge,
    important: ranked.slice(0, IMPORTANT_LIMIT),
    more: ranked.slice(IMPORTANT_LIMIT),
    total: (reviewNudge ? 1 : 0) + ranked.length,
  };
}

// ── data entry point ───────────────────────────────────────────────────────

/** Wrapped in cache() — the Today page and /notifications both call it. */
export const getRankedNotifications = cache(async (): Promise<RankedNotifications> => {
  const [pendingEvents, pendingTodos, advisories, actionsSoon, urgentTodos, systemItems, dismissed] =
    await Promise.all([
      getPendingReviewEvents(),
      getPendingReviewTodos(),
      getActiveAdvisories(),
      getActionsSoon(ACTION_WINDOW_HOURS),
      getUrgentTodos(),
      getActiveKeepInMindItems(),
      getNotificationDismissals(),
    ]);

  return assembleNotifications(
    {
      pendingCount: pendingEvents.length + pendingTodos.length,
      advisories,
      actionsSoon,
      urgentTodos,
      systemItems,
      dismissed,
    },
    new Date()
  );
});
