import { describe, expect, it } from "vitest";
import {
  assembleNotifications,
  buildActionSoonNotification,
  buildAdvisoryNotification,
  buildDeadlineNotification,
  buildReviewNudge,
  buildSystemNotification,
  rankNotifications,
  IMPORTANT_LIMIT,
  type Notification,
  type NotificationSources,
} from "@/lib/notifications";
import type { CalendarEvent, KeepInMindItem, Todo } from "@/lib/types";

// 2026-08-29 14:00 America/New_York — household "today" is 2026-08-29.
const NOW = new Date("2026-08-29T18:00:00.000Z");
const H = 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

function mkEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    title: "Football practice",
    kind: "event",
    familyMemberId: null,
    ownerMemberIds: [],
    scope: "family",
    busyStatus: "free",
    allDay: false,
    isCritical: false,
    status: "confirmed",
    sourceType: "manual",
    startsAt: iso(2 * H),
    createdAt: iso(-24 * H),
    ...over,
  };
}
function mkTodo(over: Partial<Todo> = {}): Todo {
  return {
    id: "t1",
    title: "Return the form",
    familyMemberId: null,
    ownerMemberIds: [],
    completed: false,
    isCritical: false,
    status: "confirmed",
    sourceType: "manual",
    ...over,
  };
}
function mkKim(over: Partial<KeepInMindItem> = {}): KeepInMindItem {
  return { id: "k1", body: "Rain after 3pm", icon: "weather", familyMemberId: null, dismissed: false, ...over };
}
const noneDismissed = new Set<string>();

describe("buildReviewNudge", () => {
  it("is null when nothing is pending", () => {
    expect(buildReviewNudge(0, NOW)).toBeNull();
  });
  it("summarises the pending count and is not dismissible", () => {
    const n = buildReviewNudge(3, NOW)!;
    expect(n).toMatchObject({ id: "review", kind: "review", href: "/review", dismissible: false });
    expect(n.title).toBe("3 new entries need review");
  });
  it("uses the singular for one", () => {
    expect(buildReviewNudge(1, NOW)!.title).toBe("1 new entry needs review");
  });
});

describe("buildAdvisoryNotification", () => {
  it("shows a future advisory, ranked on when it applies (not detection time)", () => {
    const a = mkEvent({ id: "a1", kind: "advisory", startsAt: iso(48 * H), createdAt: iso(-1 * H) });
    const n = buildAdvisoryNotification(a, NOW)!;
    expect(n).toMatchObject({ id: "advisory:a1", kind: "advisory", severity: "high", dismissible: false });
    expect(n.at).toBe(new Date(a.startsAt).getTime());
  });

  it("is critical when the entry is flagged", () => {
    const a = mkEvent({ kind: "advisory", isCritical: true, startsAt: iso(3 * H) });
    expect(buildAdvisoryNotification(a, NOW)!.severity).toBe("critical");
  });

  it("stays visible for 24h from detection even after its day has passed", () => {
    const a = mkEvent({
      kind: "advisory",
      allDay: true,
      startsAt: iso(-20 * H), // yesterday-ish
      createdAt: iso(-20 * H), // detected 20h ago → +24h is still 4h away
    });
    expect(buildAdvisoryNotification(a, NOW)).not.toBeNull();
  });

  it("disappears once both the 24h window and the applicable day are past", () => {
    const a = mkEvent({
      kind: "advisory",
      allDay: true,
      startsAt: iso(-48 * H),
      createdAt: iso(-48 * H),
    });
    expect(buildAdvisoryNotification(a, NOW)).toBeNull();
  });
});

describe("buildActionSoonNotification", () => {
  it("is critical when you must physically be somewhere (busy + located)", () => {
    const e = mkEvent({ busyStatus: "busy", location: "Danvers, MA", startsAt: iso(2 * H) });
    const n = buildActionSoonNotification(e);
    expect(n).toMatchObject({ id: "soon:e1", kind: "action-soon", severity: "critical", dismissible: true });
    expect(n.at).toBe(new Date(e.startsAt).getTime());
  });

  it("is only high for a busy event with no place to be", () => {
    const e = mkEvent({ busyStatus: "busy", startsAt: iso(2 * H) });
    expect(buildActionSoonNotification(e).severity).toBe("high");
  });

  it("respects the is_critical flag regardless of busy/location", () => {
    const e = mkEvent({ busyStatus: "free", isCritical: true, startsAt: iso(1 * H) });
    expect(buildActionSoonNotification(e).severity).toBe("critical");
  });

  it("ranks on the arrival time when there is one", () => {
    const e = mkEvent({ startsAt: iso(3 * H), arrivalAt: iso(2 * H), busyStatus: "busy" });
    const n = buildActionSoonNotification(e);
    expect(n.at).toBe(new Date(e.arrivalAt!).getTime());
    expect(n.detail).toContain("Leave by");
  });
});

describe("buildDeadlineNotification", () => {
  it("is high and flagged overdue when past due", () => {
    const n = buildDeadlineNotification(mkTodo({ dueDate: "2026-08-27" }), NOW);
    expect(n).toMatchObject({ id: "todo:t1", kind: "deadline", severity: "high", dismissible: true });
    expect(n.detail?.startsWith("Overdue")).toBe(true);
    expect(n.at).toBeLessThan(NOW.getTime());
  });

  it("is normal severity when due today", () => {
    const n = buildDeadlineNotification(mkTodo({ dueDate: "2026-08-29" }), NOW);
    expect(n.severity).toBe("normal");
    expect(n.detail).toBe("Due today");
  });

  it("is critical when the task is flagged", () => {
    expect(buildDeadlineNotification(mkTodo({ dueDate: "2026-08-27", isCritical: true }), NOW).severity).toBe(
      "critical"
    );
  });
});

describe("buildSystemNotification", () => {
  it("is a non-navigating, dismissible normal-severity row", () => {
    const n = buildSystemNotification(mkKim(), NOW);
    expect(n).toMatchObject({ id: "kim:k1", kind: "system", severity: "normal", dismissible: true });
    expect(n.href).toBeUndefined();
    expect(n.title).toBe("Rain after 3pm");
  });
});

describe("rankNotifications", () => {
  const at = (offsetMs: number, over: Partial<Notification> = {}): Notification => ({
    id: over.id ?? "x",
    kind: "action-soon",
    severity: "high",
    title: "x",
    at: NOW.getTime() + offsetMs,
    expiresAt: Number.MAX_SAFE_INTEGER,
    dismissible: true,
    ...over,
  });

  it("orders by severity first", () => {
    const list = [
      at(0, { id: "normal", severity: "normal" }),
      at(0, { id: "crit", severity: "critical" }),
      at(0, { id: "high", severity: "high" }),
    ];
    expect(rankNotifications(list, NOW).map((n) => n.id)).toEqual(["crit", "high", "normal"]);
  });

  it("orders by urgency within a severity — sooner/past wins", () => {
    const list = [
      at(5 * H, { id: "far" }),
      at(-1 * H, { id: "past" }),
      at(1 * H, { id: "soon" }),
    ];
    expect(rankNotifications(list, NOW).map((n) => n.id)).toEqual(["past", "soon", "far"]);
  });

  it("a future-day advisory ranks below a near-term event of the same severity", () => {
    const advisory = at(48 * H, { id: "advisory", kind: "advisory", severity: "high" });
    const event = at(2 * H, { id: "event", kind: "action-soon", severity: "high" });
    expect(rankNotifications([advisory, event], NOW).map((n) => n.id)).toEqual(["event", "advisory"]);
  });
});

describe("assembleNotifications", () => {
  const base: NotificationSources = {
    pendingCount: 0,
    advisories: [],
    actionsSoon: [],
    urgentTodos: [],
    systemItems: [],
    dismissed: noneDismissed,
  };

  it("keeps the review nudge separate from important/more and counts it in total", () => {
    const r = assembleNotifications(
      { ...base, pendingCount: 2, urgentTodos: [mkTodo({ id: "t1", dueDate: "2026-08-29" })] },
      NOW
    );
    expect(r.reviewNudge?.id).toBe("review");
    expect(r.important.some((n) => n.kind === "review")).toBe(false);
    expect(r.total).toBe(1 + r.important.length + r.more.length);
  });

  it("splits important vs more at IMPORTANT_LIMIT", () => {
    const todos = Array.from({ length: IMPORTANT_LIMIT + 2 }, (_, i) =>
      mkTodo({ id: `t${i}`, title: `Task ${i}`, dueDate: "2026-08-29" })
    );
    const r = assembleNotifications({ ...base, urgentTodos: todos }, NOW);
    expect(r.important).toHaveLength(IMPORTANT_LIMIT);
    expect(r.more).toHaveLength(2);
  });

  it("drops expired notifications", () => {
    const deadAdvisory = mkEvent({
      id: "a1",
      kind: "advisory",
      allDay: true,
      startsAt: iso(-72 * H),
      createdAt: iso(-72 * H),
    });
    const r = assembleNotifications({ ...base, advisories: [deadAdvisory] }, NOW);
    expect([...r.important, ...r.more]).toHaveLength(0);
  });

  it("hides a dismissed dismissible notification but never an advisory or the review nudge", () => {
    const r = assembleNotifications(
      {
        ...base,
        pendingCount: 1,
        actionsSoon: [mkEvent({ id: "e1", startsAt: iso(1 * H) })],
        advisories: [mkEvent({ id: "a1", kind: "advisory", startsAt: iso(4 * H), createdAt: iso(-1 * H) })],
        dismissed: new Set(["soon:e1", "advisory:a1", "review"]),
      },
      NOW
    );
    const ids = [...r.important, ...r.more].map((n) => n.id);
    expect(ids).not.toContain("soon:e1");
    expect(ids).toContain("advisory:a1");
    expect(r.reviewNudge).not.toBeNull();
  });
});
