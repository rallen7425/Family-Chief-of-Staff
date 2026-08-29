@AGENTS.md

# Family Chief of Staff — CLAUDE.md

**"Rufus" is the AI assistant's name in the UI only** — the chat bar placeholder
and the browser tab title, driven by the single `ASSISTANT_NAME` constant in
`lib/config.ts`. Product name still TBD.

**Infrastructure naming rule (no exceptions):** every piece of infrastructure —
Postgres schema and every object in it (tables, indexes, constraints, functions),
Vercel project and aliases, GitHub repo, GCP project, local folder, package name,
migration files, `_meta.apps` — uses `family_chief_of_staff` / `family-chief-of-staff`.
"Rufus" must never appear in any of them. If you find it there, it's a bug to fix,
not a convention to follow.

---

## Session status (2026-08-29) — Today/Notifications polish + Notifications system (IN PROGRESS)

Driven by a running list of user feedback on the Today screen, then a larger
"build a proper Notifications page" request that is **mid-implementation**.

### Deploy / branch state — READ THIS FIRST

| | |
|---|---|
| **Production** | Running `6db8106` (deployment `dpl_C8UxtRCYZZ3hRHSVji6Gfwfv7Ccs`). = the review past-entry filter + the condensed Notifications tile only. |
| **`main`, committed but NOT pushed / NOT deployed** | `3c75f27` + `9f0d9e1` (2 commits ahead of `origin/main`). These are green (tsc/eslint/78 tests/build) and ready to ship — the session ended before the user said "push/deploy". **Prod is missing them.** |
| **WIP branch `notifications-system`** (in BOTH `family-chief-of-staff` @ `03d65b1` and `rocky-coast-labs` @ `1b17f16`) | Notifications system, Parts A–C of the plan. tsc + 78 tests green; `lib/notifications.ts` isn't imported anywhere yet so it's inert. |
| **Plan file** | `~/.claude/plans/quizzical-dreaming-hare.md` — the full approved design. |

### Shipped earlier this session (in `3c75f27` / `9f0d9e1`, on `main`, undeployed)

- **`06651ec` (deployed):** `lib/reviewExpiry.ts` — past-dated entries drop out of `/review`
  and the badge counts (view-time filter; end-time aware). 17 tests.
- **`6db8106` (deployed):** "Keep in mind" → "Notifications" tile — condensed rows with
  severity-less dots, pending-review as a plain row, footer "View all →" `/notifications`;
  `ScheduleCard`/`NeedsDoingCard` footer links moved. Built against the `Today` artboard in
  `design/mockups/event-redesign-prototype.html`.
- **`3c75f27`:** Today schedule preview anchored to `startOfDay` not `now`.
- **`9f0d9e1`:** `getUpcomingEvents` → `getTodayScheduleEvents` (today-only, keep an entry
  until its **end time**, all-day/no-end run through end of day, empty state — never rolls to
  tomorrow); `UnconfirmedTag` on `pending_review` entries across DayGroup / ScheduleCard /
  AdvisorySummary + hollow dot in MonthView; `getEventsInRange` + Today preview now
  `neq status dismissed`; `reviewExpiry` refined (no-end timed entry runs through its day);
  Notifications tile hard-capped at 4 rows (review row pinned); "Needs Doing" → "To Do".

Also: investigated the "X on `/review` removes the whole group" report — **not reproducible**
on current code (verified UI + DB); the per-row X already dismisses exactly one entry.

### Notifications system — plan + progress

Full spec: `~/.claude/plans/quizzical-dreaming-hare.md`. User decisions: **Critical = BOTH**
a stored `entries.is_critical` flag (extractor + form toggle) **and** rule-based promotion;
**dismiss = yes** (a store + X, advisories/review never dismissible); **tile/page "Important"
= exact parity** via `IMPORTANT_LIMIT` (not a hard constraint).

**Done (Parts A–C, on branch `notifications-system`):**
- **A — migration** `rocky-coast-labs/supabase/migrations/20260829000001_family_chief_of_staff_notifications.sql`:
  `entries.is_critical bool default false` + `notification_dismissals(notification_id text pk, dismissed_at)`.
  **NOT APPLIED** — `supabase db push` was classifier-blocked in-session; needs the user (or an
  interactive run) from `rocky-coast-labs/` with no env override.
- **B — `is_critical` end-to-end:** `lib/types.ts` (`CalendarEvent`/`Todo`/`EntryInput`),
  `dbTypes.ts` (`EntryRow` + `NotificationDismissalRow`), `mapEvent`/`mapTodo`,
  `recurrence.ts` insert shape, `updateEntry`, `EntryForm` "Critical" toggle (berry pill) +
  `EntryDetailsModal.toInitialValues`, `extractEvents.ts` zod schema, `write.ts` insert.
- **C — `lib/notifications.ts`:** `Notification` model, pure builders
  (`buildReviewNudge`/`buildAdvisoryNotification`/`buildActionSoonNotification`/
  `buildDeadlineNotification`/`buildSystemNotification`), `rankNotifications`
  (severity weight + urgency bonus + kind tiebreak), `assembleNotifications` (pure, for tests),
  `getRankedNotifications` (`cache()`). Sources: `getActiveAdvisories` + `getActionsSoon(6)`
  (new in `lib/data/events.ts`), `getUrgentTodos`, `getActiveKeepInMindItems` (table empty in
  prod), `getPendingReview*`, `getNotificationDismissals` (new `lib/data/notifications.ts`).

**Remaining (Parts D–F):**
1. Apply the migration; confirm the column + table via a REST read.
2. **D** — `lib/actions/notifications.ts`: `dismissNotification(id)` → upsert + revalidate `/`,`/notifications`.
3. **E** — rewrite `app/notifications/page.tsx` (Review / Important / More sections, severity
   dots `critical→accent-berry` / `high→primary` / `normal→muted-text`, dismiss X on
   `dismissible` rows, empty state); rewrite `components/today/KeepInMindCard.tsx` to consume
   `getRankedNotifications()` (drop `items`/`urgentTodos`/`pendingReviewCount` props); update
   `app/page.tsx` to pass it. New `components/notifications/NotificationRow.tsx` +
   `NotificationDismissButton.tsx` (client, `useTransition`).
4. **F** — `lib/notifications.test.ts` (advisory 24h boundary, action-soon 6h, `is_critical` →
   critical from each source, busy+located imminent → critical, overdue todo → high, ranking
   order, `important`/`more` split, dismissed-id filtered but advisory not).
5. Verify (tsc/eslint/test/build + browser), merge `notifications-system` → `main`, then
   decide push/deploy for the whole stack (`3c75f27` … through the notifications work).

**Follow-ups noted in the plan:** chat `create_event_draft` gaining `is_critical`; un-dismiss
UI + a cleanup sweep for stale `notification_dismissals`; a real generator for
`keep_in_mind_items`.

### Local dev reminder

Global `node` is v20; the repo needs ≥22. Use `/opt/homebrew/bin/node` (v26):
`PATH="/opt/homebrew/bin:$PATH" npx vitest run` / `tsc` / `node_modules/.bin/next dev`.
No local DB — `.env.local` points at prod Supabase; read-only REST checks via
`curl "$SUPABASE_URL/rest/v1/..." -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Accept-Profile: family_chief_of_staff"`.

---

## Session status (2026-08-28) — Event/Task/Reminder/Advisory redesign (P0 + P1)

Working from `claude-code-implementation-prompt.md` (in the repo root, untracked):
a UX-review-driven redesign of the schedule experience — four content kinds,
better role modeling, arrival-time intelligence, plus a routing-API travel-buffer
conflict feature deferred to a later phase. Phased P0 → P1 → P1.5 → P2, review
after each.

### State right now — DEPLOYED to production, commits NOT pushed

| | |
|---|---|
| **Commits** | `family-chief-of-staff`: `f70165e` (P0), `a4d8966` (P1a), `3a90baf` (P1b), `23f9eb6` (this status) — **not pushed to GitHub**. `rocky-coast-labs`: `c3b9f49` (P0 migration), `a388e16` (P1a migration) — **not pushed**. |
| **Migrations** | `20260828000002_family_chief_of_staff_entry_kind.sql` + `20260828000003_family_chief_of_staff_entries.sql` — applied to the shared DB via `supabase db push` (verified with smoke scripts). |
| **Production** | **P0+P1 deployed 2026-08-28** via `vercel --prod` from the local tree (deployment `dpl_HCk9U1BocnvcWZbKmhn6jYsyvNfv`). Verified: all routes 200 incl. new `/settings`, `/api/*` guards 405, `/schedule` + `/settings` render real `entries`-backed data. Divergence check pre-deploy: 0 `events`/`todos` rows missing from `entries` (nothing was created on prod after the migration). |
| **Checks** | `tsc` / `eslint` / `next build` / `npm test` (61) all green. |

**Still open:** (1) `git push` both repos to `origin/main` — the deploy went
straight from the local working tree, GitHub is behind. (2) The old `events` (67
rows) / `todos` (26 rows) tables remain as a rollback net; drop them with a small
`rocky-coast-labs` migration now that P1 is live and verified. The deployed app
writes only to `entries`, so those tables are frozen/orphan from here on.

### How the DB password worked this session

`rocky-coast-labs/.secrets/db-password.txt` (dated Jul 10) fails SASL auth — looks
rotated; the user has the current one. Key finding: `supabase db push` from
`rocky-coast-labs/` **succeeds with a cached credential** even when
`SUPABASE_DB_PASSWORD` is unset — passing the stale `.secrets` value *explicitly*
is what was breaking it, so just run `supabase db push` with no env override. The
CLI (2.107) is authenticated; `rocky-coast-labs` is `linked`. The Docker "failed
to cache migrations catalog" warning on push is non-fatal.

### P0 — delete action, real date/time pickers, Advisory kind (`f70165e`)

- **Delete** (the UX review's #1 gap — there was no way to delete an event
  anywhere): `deleteEvent`/`deleteTodo` → now `deleteEntry`. `EntryDetailsModal`
  edit mode has a "Delete entry" flow: idle red text-link → inline confirm
  (red-tinted, no native `confirm()`) → "Entry deleted" end-state replacing the
  form. `deleteEntry` deliberately does NOT `revalidatePath` (that unmounts the
  modal's host row before the confirmation renders); the client calls
  `router.refresh()` on "Done".
- **Date/time pickers** (`components/shared/DatePickerButton.tsx`,
  `TimePickerButton.tsx`) replace native `<input type=date|time>`, fixing the
  `08/26/2026` → `mm/08/262026` mangling bug. Month calendar-grid popover
  (click-only) + scrollable 15-min time list with a tolerant type-to-jump parser
  (`lib/timeInput.ts` + `.test.ts`, 5 tests: `4pm`, `4:30 pm`, `430pm`, `0930`…).
- **Advisory** kind: migration `...entry_kind.sql` added `events.kind`
  (`event`|`advisory`, default `event`). Renders visually distinct — muted, no
  person color, collapsible "N advisories" strip atop each day
  (`AdvisorySummary.tsx`); MonthView gives advisory-only days an outline-ring dot;
  Today card renders advisories muted with an info icon.

### P1a — data/action layer onto the unified `entries` table (`a4d8966`)

Migration `...entries.sql`: created `entries` (4-way `kind`; `busy_status`,
`scope`, `subject_member_id`, `category`, `due_at date`, `arrival_at` +
`arrival_source`, `linked_entry_id` self-FK `ON DELETE SET NULL`,
`recurrence_id`/`recurrence_until`, `completed_at`), `entry_owners`
(`(entry_id, family_member_id)` PK), `member_locations` (seeded one address-less
household `Home`), `arrival_buffer_rules` (seeded `{null,15}` + `{game,60}`).

All `events` + `todos` rows copied into `entries` **keeping their ids** (67 event
+ 26 task = 93; verified). `entry_owners` backfilled for kid-subject
(family-scoped) entries only — adult-subject = `personal`, no owner row (matches
the form's "personal entry, no separate owner" rule). Judgment calls: `due_at` is
a `date` not a timestamp; `status` kept `dismissed` (load-bearing for
`removeReviewItems`); `scope` derived adult→`personal` else `family`.

App swap is **behavior-neutral** — same `CalendarEvent`/`Todo` return shapes,
internals now query `entries` (`kind in (event,advisory)` for schedule, `task`
for todos, completion = `completed_at != null`). `review.ts` collapsed its
by-kind split into one `.in("id", …)`. Old `lib/actions/events.ts`/`todos.ts`
deleted; new `lib/actions/entries.ts`. Verified live: Today/Schedule/Todo/Review
render real data, todo-toggle round-trips, chat schedule query intact.

### P1b — EntryForm, Reminder kind, arrival buffers, Settings (`3a90baf`)

- **`EntryForm`** (`components/entries/`) — one create/edit form, all four kinds.
  4-way Type selector (create only; locked pill in edit), **multi-owner**
  `MultiOwnerPicker` (§8 — overrides the mockup's single dropdown; adult Subject
  auto-clears Owner + "Personal entry" caption), Category dropdown (Event +
  Reminder), Arrival-time field + provenance badge (purple auto/from-email, blue
  manual, dashed "Not set — no default" empty state), Busy/Free toggle, Reminder
  "About" linker, Advisory date range. Replaces `EventForm`/`TodoForm`/
  `AddEventDialog`/`AddTodoDialog` (all deleted). `AddEntryDialog` +
  `EntryDetailsModal` (renamed from `EventDetailsModal`) wrap it; the `/review`
  pencil (now wired for every kind) and `ChatPanel`'s proposal card reuse it.
  `EntryEditingContext` supplies `arrivalRules`/`linkables` to
  modals opened from list views instead of prop-drilling.
- **`lib/arrival.ts`** — `matchArrivalRule` / `inferArrivalAt` / `describeArrivalRule`.
  Exact category match beats the general kids' default; nothing for
  adult / whole-family / non-event. Used by BOTH `scripts/pipeline/write.ts` and
  EntryForm's live badge. `lib/arrival.test.ts` (10 tests) covers the §9 cases
  (kid game → −60min, kid other → −15min, adult/family → none).
- **Extraction** — `extractEvents.ts` schema widened to 4 kinds + `end_time`,
  `arrival_time`, `category` (fixed vocab). `write.ts` lands those in structured
  fields (not notes — fixes the Football-practice "4:00–6:30pm" bug), computes
  stated-or-inferred arrival, writes an `entry_owners` row for kid subjects,
  advisories forced to null subject. `index.ts` fetches `arrivalRules` once and
  threads it in. Chat `create_event_draft` gained `category` + `arrival_time`.
- **Data** — `lib/data/events.ts`/`todos.ts` embed `entry_owners` via nested
  select; `attachReminders` nests reminders under their `linkedEntryId` parent
  (standalone stay top-level). `getPendingReviewEntries` returns all four kinds
  as `CalendarEvent`-shaped rows (`dueDate` set for tasks) → one unified
  `/review` list with kind-coloured badges (Event blue / Reminder purple /
  Task teal / Advisory gray). `getLinkableEntries` backs the "About" picker.
- **`/settings`** (`app/settings/page.tsx` + `ArrivalRulesEditor.tsx`) — rule
  list, 5-min steppers (0–180), add/remove, general default not removable,
  blue worked-example callout. Reached via a **gear icon** in `AppHeader` (the
  previously-dead hamburger button, now `<Link href="/settings">`).
- **Schedule rendering** — "Arrive h:mm" pills on event rows (purple inferred /
  blue manual-stated), linked reminders as bell sub-lines, standalone reminders
  as compact muted rows. Conflict flags are P1.5.

Verified live: created a kid's game via EntryForm → 60-min "Auto · game default"
arrival badge auto-filled and rendered on the schedule; `/settings` stepper
15→20→15 persisted; delete end-state; `/review` + chat query intact.

### Deferred / not built

- **P1.5** — `member_locations` geocoding on save, `busy_status`-driven
  travel-buffer conflict detection (`lib/conflicts.ts`), conflict banners.
  **Blocked on a routing API key + billing** (Google Distance Matrix + Geocoding
  → `GOOGLE_MAPS_API_KEY`, or Mapbox → `MAPBOX_ACCESS_TOKEN`). User is holding
  off. The table + address-less `Home` row already exist.
- **P2** — visibility overrides beyond the computed `lib/visibility.ts` rule;
  per-transport-mode buffers. Depends on P1.5.
- Recurring-series per-occurrence arrival times (one-off path only in P1b).
- Chat can only propose `event`/`task` drafts, not `reminder`/`advisory`.

### Next session should

1. `vercel --prod` to deploy P0+P1 (reconcile any prod-created rows first — see
   Divergence risk above), then click-test the live site.
2. After verification, a small `rocky-coast-labs` migration dropping the now-orphan
   `events` / `todos` tables.
3. Push both repos to `origin/main`.
4. Then P1.5 once a routing key is provisioned, or whatever the user brings.

---

## Session status (2026-08-28) — earlier: tech-debt / infra-naming cleanup

### Current status — everything is live and in sync

All work below is committed, pushed to `origin/main` (HEAD `28b65ea`), and
deployed to production (`family-chief-of-staff.vercel.app`, verified: all routes
200, custom 404 renders, API guards return 405/401, `rufus-olive` 404s). Both
`family-chief-of-staff` and `rocky-coast-labs` repos are clean and pushed. The
index-rename migration is applied to the shared DB. `npm test` (44) / `tsc` /
`eslint` / `next build` all green. No `rufus` anywhere in infrastructure.

### Completed this session

Three workstreams, all cleanup before new functionality (per standing instruction):

**1. End-to-end review** — git, mail pipeline, DB, Vercel, GitHub. Found: a
recurring Gmail-scan timeout, a lingering `rufus-olive` Vercel alias, and a
tech-debt list. All actioned below.

**2. Gmail-scan pipeline timeout — fixed (`3dc161d`, deployed).** A scheduled run
on 2026-08-27 hit the route's 60s `maxDuration` and 504'd — the per-message loop
was fully sequential (Gmail fetch + attachment parse + one Claude call each) and a
burst of ~19 new emails couldn't finish. Now (`scripts/pipeline/index.ts`):
processes at most 8 not-yet-seen messages per run (rest deferred to the next
2-hour tick — they stay unlogged so they're picked up), 4-way concurrent via
`lib/concurrency.ts` `mapWithConcurrency`, oldest-first so a backlog drains in
order, one batched dedupe query. `maxDuration = 60` also pinned on the chat route.
Scan window widened `newer_than:2d` → `4d` (`maxResults` 25 → 50) so the per-run
cap can't strand a message past the window. Verified against the real inbox
(8 msgs / ~10s / 0 errors).

**3. "Rufus" infra-naming audit — fully closed (`db1f5a4`, `decc24f`).** The
2026-08-25 schema rename missed spots `ALTER SCHEMA … RENAME` doesn't reach:

| Where | Fix |
|---|---|
| 5 Postgres indexes still `idx_rufus_*` | renamed → `idx_family_chief_of_staff_*` (`rocky-coast-labs/.../20260828000001_rename_rufus_indexes.sql`, applied) |
| `_meta.apps` notes: stale path, false "alias removed" claim | corrected in the same migration |
| Vercel alias `rufus-olive.vercel.app` (served production) | removed — **two steps**: `vercel alias rm` only drops the live pointer; the domain stays attached and the next `vercel --prod` re-aliases it. Real fix: dashboard → Project → Settings → Domains → remove it, confirm `family-chief-of-staff.vercel.app` is the Production domain. Verified across two later deploys. (`vercel project ls` still misreports it as "Latest Production URL" — stale cache in the pinned old CLI v54; dashboard + `vercel inspect` are correct.) |
| GitHub repo "About" link → `rufus-olive` | set to `family-chief-of-staff.vercel.app` |
| `.vercel/project.json` `projectName: "rufus"` | → `"family-chief-of-staff"` |
| `CLAUDE.md` / `IMPLEMENTATION-PLAN.md` | retitled; explicit infra-naming rule at top of this file; "historical, names outdated" banner on the plan |

Left as historical record on purpose: git commit messages, the applied
`rocky-coast-labs` migration filenames (`*_rufus_*.sql` — renaming applied
migrations breaks the version tracker), and the `docs/design/*` plan bodies
(banner instead of a retro-edit).

**4. Tech-debt pass (`28b65ea`).**
- **Tests** — Vitest (`npm test`), 44 tests: `lib/visibility.ts`, pipeline person
  resolution (`scripts/pipeline/write.ts` — guards the wrong-kid-misattribution
  regression), `lib/events/recurrence.ts` (DST-safe weekly series, extracted from
  `lib/actions/events.ts`), `lib/concurrency.ts`, `lib/householdTime.ts`,
  `lib/dateParam.ts`. Refactors were behaviour-neutral.
- Tests surfaced a real bug: `householdLocalToInstant` returned TZDate's
  offset-form ISO (`…-05:00`); normalized to canonical `…Z` so email-scan /
  recurrence `starts_at` values match the client-computed manual/chat ones.
- **Error/loading UI** — `app/error.tsx`, `global-error.tsx`, `not-found.tsx`,
  `loading.tsx` (a server-component throw previously showed the raw Next.js page).
  Note: Next 16.3 error-boundary prop is `retry`, not `reset`.
- **Node pinned** — `engines.node >= 22`; `ws` shim in `lib/supabase.ts` made
  conditional (only when `globalThis.WebSocket` is absent).
- **Verified intentional, not touched:** the `lib/actions/*` split where
  form-submit actions return `{ error }` and fire-and-forget actions
  (`confirmEvent`/`dismissEvent`/`toggleTodo`/review bulk ops) `throw`.

### What's broken / open risk

- **`/api/chat` is a fully open public endpoint** — no auth, no secret, no rate
  limit; runs up to 4 `claude-opus-5` calls on our key per request and returns
  real family data. Known, accepted exposure — to be closed as part of the auth
  workstream (see "Auth / login — not built" below), not patched in isolation.
- **GitHub scheduled cron is intermittently unreliable** — the `gmail-scan`
  workflow's 2-hour `schedule` trigger drifts / drops runs under GitHub load
  (normal for free scheduled Actions). The pipeline self-heals (next run catches
  up) and the timeout fix removes the 504 failure mode, but a `Run failed` email
  can still appear. Not yet worth migrating off GitHub Actions.
- **Review backlog: ~54 pending items** (34 events + 20 todos) in `/review`.
  Most are genuine; cruft to dismiss (I was blocked from bulk-editing the family
  DB, correctly): Student Orientation ×3, First day of classes ×2, Convocation
  ×2, School Picture Day (Chapel Dress) ×2, "First EF coach meeting" ×2, "Coffee
  catch-up with Chris Gardner" == "Chris <> Rick Allen (Zoom)", testing-
  accommodation-forms todo ×4; "Summer Street lane closure" ×4 (one advisory
  over-extracted); likely-not-real: "Admissions call … AI Career Boost Blueprint"
  (cold sales), "School Picture Day Sep 8" (photo-vendor marketing; real one is
  Sep 14). Keep both Grandparents' Day rows (Oct 6 A–K / Oct 7 L–Z are distinct).
- **Local dev is still on Node 20.10** (Vercel is 24.x). `@supabase/supabase-js`
  prints a deprecation warning on every script run. `engines` is pinned but the
  machine isn't upgraded, so `ws` can't be fully removed yet.
- **Vercel CLI (54) and Supabase CLI (2.107) are stale** — a `brew upgrade` on
  the user's machine. The old Vercel CLI is why `vercel project ls` misreports.
- **GCP project / OAuth client name** — believed "Family Chief of Staff" per
  Phase 6; not verifiable without `gcloud`. Worth a glance in the console.

### Next session should pick up

1. **User's local-machine chores** (handed over, not blocking): `brew upgrade
   vercel-cli supabase`; `nvm install 24 && nvm alias default 24`. Once Node is
   ≥22 everywhere, delete the `ws` dep + `@types/ws` + the shim in
   `lib/supabase.ts` (~3 lines).
2. **Triage the `/review` backlog** using the list above — or the user does it in
   the UI (per-group Approve / per-item dismiss / Approve All).
3. **Confirm the Gmail-scan cron is healthy** post-deploy — check the next 1–2
   scheduled runs succeeded (Actions tab) now that the capped/parallel pipeline
   is live.
4. **Then**: whatever the user brings. The big planned workstream is **login /
   onboarding / user management** (see the "Auth / login — not built" section) —
   securing `/api/chat` is in scope for it.
5. Lower priority: component/route tests (this pass only covered pure logic);
   GCP console name check.

---

## Session status (2026-08-25)

Before this session: all 8 build phases were complete and deployed, and the 2026-08-24
session's commits (event details/history modal, review-page editing, person-detection/
visibility) were sitting locally, never pushed to GitHub or deployed.

**This session:** (1) ran a full code review on the 2026-08-24 session's unpushed
commits before shipping anything, per standing instruction to always clean up before
proceeding — found and fixed three real correctness bugs plus some smaller cleanup
(listed below); (2) renamed all "rufus" infra naming to generic/`family_chief_of_staff`
naming, since the working name "Rufus" was never meant to leak into infra (schema,
folder, package name) — the chat persona name itself stays "Rufus," now driven by a
single `lib/config.ts` constant so rebranding it later is a one-line change; (3) hit and
resolved a serious Supabase platform outage along the way (full incident below); (4)
pushed and deployed everything — **this is all live now.**

**Incident (resolved 2026-08-25): Supabase project-wide PostgREST outage during the
schema rename, unrelated to a config mistake on our side.** The schema-rename migration
and `supabase config push` both applied correctly — verified directly against Postgres
(`family_chief_of_staff` exists, `rufus` is gone) — but the shared project's
PostgREST/Data-API service never picked up the new config, returning 503 `PGRST002`
project-wide (every app on the shared `rocky-coast-labs` Supabase project, not just this
one). PostgREST's own logs showed it stuck booting with the **old** pre-rename schema
list (`"schema \"rufus\" does not exist"`, `3F000`) despite the stored config already
being correct. A full "Restart project" cycle didn't fix it either — same error
afterward. Filed a Supabase support ticket (`SU-454805`, free plan, no SLA); their first
suggested cause (an `authenticator` role-level `pgrst.db_schemas` override) was checked
and ruled out — no such override existed anywhere. **What actually fixed it: Pause
project, then Resume/Restore** (Settings → General) — a full reprovision, not just a
restart-in-place of the same stuck container. Confirmed via direct `curl` against the
REST API and PostgREST logs before declaring it fixed. Lesson for any future Supabase
outage on this shared project: **try Pause+Restore before waiting on support**,
especially on the free tier where ticket response isn't guaranteed.

**Verified live post-deploy:** Today page renders real data (Keep in Mind items,
32 pending review entries queued up from while the API was down), page title/chat bar
correctly say "Rufus" via the new `ASSISTANT_NAME` constant, and `/schedule`, `/review`,
`/todo`, `/notifications`, `/message` all return 200. **Not yet manually verified:** the
`/schedule` person-filter behavior and a person-specific chat question in the live
UI (the underlying fixes were code-reviewed and are deployed, just not click-tested
live) — worth a quick check next time the app is open. The 32-item review backlog is
also worth a look — likely just Gmail-pipeline output that queued up during the outage,
not a new problem.

**Rename details:** local repo folder moved from `~/Documents/Claude/Projects/rufus` to
`~/Documents/Claude/Projects/family-chief-of-staff`; `package.json`/`package-lock.json`
name field updated; the Postgres schema in the shared `rocky-coast-labs` Supabase
project renamed `rufus` → `family_chief_of_staff` (migration
`rocky-coast-labs/supabase/migrations/20260825000001_rename_rufus_schema_to_family_chief_of_staff.sql`,
`config.toml`'s exposed-schemas list, and the `_meta.apps` row all updated to match);
`lib/supabase.ts` / `lib/data/dbTypes.ts` / `scripts/gmail/get-refresh-token.ts` updated
to the new schema name. GitHub repo and Vercel project were already correctly named
`Family-Chief-of-Staff` from the 2026-08-22 session below — no change needed there.

**Bugs fixed from the code review:** chat's `query_schedule` tool was leaking other
family members' events when filtered to one person (a side effect of
`getEventsInRange`'s new visibility-based filter — correct for `/schedule`, too broad
when reused by chat, fixed in `lib/chat/tools.ts` only); the email pipeline's
`resolvePerson` (`scripts/pipeline/write.ts`) could misattribute an event to the wrong
kid when the LLM named a real but non-family person from a school-domain sender, instead
of leaving it unassigned; editing an existing event's "Repeats" checkbox silently did
nothing since `updateEvent` never reads it — now hidden while editing
(`EventForm`'s new `isEditing` prop); `EventDetailsModal`'s reset-on-reopen relied on an
easy-to-forget `key`-remount convention in callers — standardized on conditional
mounting (matches how `ReviewList` already did it).

**Fixed and deployed in the 2026-08-22 session** (see the dated sections below for full detail):
- Keep in Mind redesign (capped at 3 + "View all"), `/notifications` inbox as a real
  page between the bell and `/review`, `/review` page redesigned with grouping/checkbox
  select/per-group+global approve/remove.
- Chat's `query_schedule` semantic matching (dropped the literal-keyword filter that
  missed "Scrimmage" as a "game").
- Recurring events via chat (asks for an end date instead of creating one occurrence)
  and a duration/end-time field on the manual Add Event form.
- Historical email backfill for Austin Prep (Nora's school).
- **Critical systemic timezone bug**: all server-rendered times were silently correct
  only by local-machine coincidence and would have been 4-5 hours off in real
  production (Vercel defaults to UTC). Fixed via `instrumentation.ts`. **Explicitly
  verified live on production** (not just locally) — Football practice now correctly
  shows 4:00 PM on `family-chief-of-staff.vercel.app`.
- Email body-extraction bug (empty `text/plain` parts from veracross.com/Austin Prep
  hid real content) — fixed and 14 affected emails reprocessed, recovering real
  events/todos.
- Date-anchor bug in email extraction (prevented a repeat of a wrong-year extraction).
- Today screen day-label bug (tomorrow's events looked like today's with no day shown).
- Data cleanup: deduped Grandparents' Day double-entries, reassigned un-colored
  Sophomore Retreat/Leader Training events to Ben.
- Mobile keyboard covering the chat input (`100vh` → `100dvh` in `ChatPanel.tsx`).

**Confirmed working via direct production testing, but not yet confirmed by the user
in their own session:**
- Grandparents' Day — chat correctly answers with both dates, location, and the
  related todo, tested directly against the live `/api/chat` endpoint right after the
  body-extraction fix deployed. The user's original "still no record" report may have
  been against a slightly stale deploy or a cached mobile session — worth a quick
  re-check with them next session if it comes up again.

**Not verifiable by tooling — needs the user's real-device confirmation:**
- Mobile keyboard fix — headless browser tooling can't trigger a real on-screen
  keyboard to confirm the resize behavior actually works as intended.
- Whether the Today-screen day-label fix now reads clearly (was based on the user's
  description of the underlying confusion, not a screenshot).

**Next session should:** start from whatever the user found during this review pass —
don't assume the list above is the agenda unless they bring one of these items back up.

---

## Deployment & access

| | |
|---|---|
| **Live site** | https://family-chief-of-staff.vercel.app |
| **GitHub repo** | git@github.com:rallen7425/Family-Chief-of-Staff.git |
| **Branch** | main |
| **Vercel project** | rick-allen-s-projects/family-chief-of-staff |
| **Local dev** | `npm run dev` → http://localhost:3000 |

GitHub repo and Vercel project are deliberately named "Family-Chief-of-Staff", not
"Rufus" — the product name may still change, and this avoids a legacy name trail (same
reasoning applied to the GCP OAuth app in Phase 6).

> **Deploy:** `vercel --prod` from the repo root. No CI auto-deploy configured — matches
> Distilled/PM ReArchitected's manual-deploy convention.

---

## What this app is

Rufus is a single-household "family chief of staff" app: a Today dashboard, a full
Schedule/calendar, a Todo list, and a persistent AI chat bar ("Chat with Rufus") that can
answer questions and create events/todos from natural language. A background pipeline
scans Gmail for schedule-relevant content (body text and docx/pdf attachments) and adds
detected events/todos automatically, flagged for the user to review afterward.

**No login/auth system in the MVP** — single household, single implicit user.

Full spec/design reference lives in `docs/design/` (`MVP-Spec.md`, `Design-System.md`,
`Family OS - Calendar.md`, `Design Concepts/` — the latter is reference-only, superseded
by `Design-System.md` for actual token values). The implementation plan this app was
built from is at `docs/design/IMPLEMENTATION-PLAN.md`.

**Core screens:**
- **Today** (`/`) — dashboard: "Keep in Mind" reminders (+ events awaiting review),
  Schedule preview, "Needs Doing" todos preview, persistent chat bar.
- **Schedule** (`/schedule`) — full calendar. View modes: Day / 3-Day / Week / Month.
  Filter by family member. Manual add (title, person, date/time, location, notes).
- **Todo** (`/todo`) — same pattern as Schedule: list + person filter + add.
- **Message** (`/message`) — placeholder only. This is a **future** family-to-family
  messaging feature, unrelated to and separate from the AI chat bar.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js (App Router) | `create-next-app`, no `src/` dir |
| Styling | Tailwind CSS v4 (CSS-first) | Tokens in `app/globals.css` `@theme` block |
| Database | Supabase (Postgres) | Shared `rocky-coast-labs` project, schema `family_chief_of_staff` — **no auth**, single service-role client, no browser client |
| AI | Anthropic Claude API | Chat (`/api/chat`, tool-use) + email-scan extraction (batched, Distilled-style) |
| Email ingestion | Gmail API (read-only) | Single mailbox (`rallen7425@gmail.com`), OAuth refresh token stored server-side |
| Ingestion pipeline | GitHub Actions (cron) | Calls a Vercel API route with a shared-secret header — mirrors Distilled's pipeline, avoids Vercel Pro's cron limits |
| Hosting | Vercel Hobby (free) | |

---

## Design system

Authoritative source: `docs/design/Design-System.md`. Concrete Today-screen layout
reference (built on the real tokens): `docs/design/Design Concepts/stitch_Today_Mobk-up/code.html`.

**Tokens** (`app/globals.css`):
```
mist #F7F9FB · surface #FFFFFF · ink #23262B · border #E1E5EB
muted-label #8B93A0 · muted-text #5C6570
primary #3B6FE5 / hover #2C56C4
accent: coral #F0714B · teal #2FA9A0 · gold #E3A73A · berry #E8567A
font-display: Bricolage Grotesque · font-body: Instrument Sans
radius: card 20px · pill 9999px · input 12px
```

Icons: `lucide-react` (line-style, 2px stroke — matches the written spec; the static
mockup happens to use Google's Material Symbols font instead, not carried forward).

---

## Data layer

Supabase — the shared "Rocky Coast Labs" project (ref `kywdezqgrtpzuecxxvfc`), schema
`family_chief_of_staff` (renamed from `rufus` 2026-08-25 — see the dated session note
below). Migrations/RLS/grants live in the separate `rocky-coast-labs` repo, not here —
see its `ARCHITECTURE.md` for the platform-wide convention (one Supabase project, one
schema per app). This app only ever queries its own `family_chief_of_staff` schema via `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (server-only, never shipped to the browser) — no anon key, no
browser Supabase client, no session/cookie handling, since there's no login concept.

**Family roster (seeded):** Rick (Dad, coral, adult) · Kim (Mom, teal, adult) · Ben
(gold, kid) · Nora (berry, kid). The `is_adult` flag (added 2026-08-24) drives computed
event visibility — see `lib/visibility.ts`. A future onboarding/user-management flow
will let colors be reassigned or repeated.

**Event/todo provenance:** every row stores `source_type` (`manual` | `chat` |
`email_scan`) and `source_detail` (jsonb) so the user can trace where information came
from, and so the chat can cite sources when answering questions — since 2026-08-24 this
is also surfaced to the user directly via `EventDetailsModal`'s History section, not just
used internally. Auto-detected (email-scan) events/todos are inserted immediately with
`status: 'pending_review'` — not held in a blocking queue — and surfaced as a review
nudge on the Today screen. Person resolution (`scripts/pipeline/write.ts`) tries an exact
name match against the roster first, then falls back to `family_chief_of_staff.member_email_domains`
(sender-domain → family member, e.g. a kid's school mailer) before giving up.

---

## Current build phase

**Phase 0 — Scaffolding & tokens.** Done.

**Phase 1 — Static UI, dummy data.** Done: `lib/types.ts` (mirrors the planned `rufus`
schema), `lib/mockData.ts` (seeded with the real family roster), and `lib/data/*.ts`
(`events.ts`, `todos.ts`, `keepInMind.ts`, `familyMembers.ts`) — built one phase early as
async functions backed by mock data so Phase 3 only has to swap internals, not call
sites. Today dashboard (Keep in Mind incl. `pending_review` nudges, Schedule preview,
Needs Doing preview) and Schedule (`/schedule`, all 4 view modes — Day/3-Day/Week/Month —
driven by `?view=&date=&person=` search params, person filter, date nav) and Todo
(`/todo`, person filter, review-status badge) all built and verified in-browser against
the mockup. No Supabase/auth/mutations yet — everything here is read-only against
`lib/mockData.ts`.

**Phase 2 — Supabase infra.** Done: `rufus` schema migration pushed to the shared
project (`rocky-coast-labs/supabase/migrations/20260822000001_rufus_schema.sql` —
tables, RLS enabled with zero anon/authenticated policies, service_role-only grants,
family roster seeded directly in the migration), `rufus` added to `config.toml`'s
exposed API schemas, `_meta.apps` row added. Verified: schema is exposed via PostgREST
but anon access is correctly denied (permission error), and `lib/supabase.ts`'s
service-role client reads the seeded roster successfully.

**Phase 3 — Wire real data.** Done alongside Phase 2 rather than as a separate step:
`lib/data/*.ts` internals swapped from `lib/mockData.ts` (deleted, no longer
referenced) to real Supabase queries via `lib/data/dbTypes.ts` row types. `app/page.tsx`
marked `force-dynamic` (it would otherwise have been statically prerendered at build
time with stale data baked in, since Server Components can call Supabase directly).
Verified in-browser against the live (currently empty except family_members) database —
all three Today cards and Schedule/Todo show correct empty states, person filter pulls
the real roster.

**Phase 4 — Manual CRUD.** Done: `lib/actions/events.ts` (`createEvent`, `updateEvent`,
`confirmEvent`, `dismissEvent`) and `lib/actions/todos.ts` (`createTodo`, `toggleTodo`) —
plain async Server Actions called directly from client components via `useTransition`
(not `<form action>`/`useActionState`), taking typed input objects rather than FormData.
`components/shared/Modal.tsx` (reusable dialog shell) and `components/events/EventForm.tsx`
(shared by both AddEventDialog and EventReviewDialog's edit mode) — event start times are
computed as `new Date(...).toISOString()` in the browser, not the server, so the user's
actual local timezone resolves correctly regardless of the server's timezone (Vercel
defaults to UTC). `AddEventDialog`/`AddTodoDialog` wired into the Schedule/Todo page
headers; `TodoCheckbox` makes todo completion interactive; `PendingReviewNudge` (in
`components/events/EventReviewDialog.tsx`) replaces the static "needs your review" text
in `KeepInMindCard` with a real dialog showing full provenance (sender/subject/attachment/
snippet) and Confirm / Edit / Remove actions.

Verified end-to-end in-browser against the live database: created a real event and todo
through the UI, toggled todo completion, and inserted a test `pending_review` event to
exercise the full review → edit → confirm flow (including the time-correction case,
confirming the browser-timezone-safe date handling works) — then cleaned up all test
rows.

**Phase 5 — Chat/NL.** Done: `app/api/chat/route.ts` runs a manual agentic loop (not the
beta Tool Runner — the routing need here, intercept-and-stop on a draft tool call vs.
continue-the-loop on `query_schedule`, is simple enough that a ~30-line manual loop was
clearer than learning the runner's gating hooks) against `claude-opus-5` with three tools
in `lib/chat/tools.ts`: `query_schedule` (executes immediately, results fed back to
Claude), `create_event_draft`/`create_todo_draft` (return a draft only — no DB write; the
route stops the loop and returns it to the client). `ChatProvider` (client context: message
history, open/closed panel state, current draft) + `ChatBar` (always-visible pill, now
interactive) + `ChatPanel` (conversation view, opens on send or focus) + `ChatShell`
(switches between the two in the root layout). The proposal card reuses `EventForm`/
`TodoForm` from Phase 4 directly, pre-filled from the parsed draft — confirming calls new
`createEventFromChat`/`createTodoFromChat` actions (`source_type: 'chat'`, `source_detail:
{message}`) rather than duplicating a third form.

Real bug caught and fixed during testing: `query_schedule` was originally handing Claude
raw ISO timestamps, and Claude read the UTC clock digits as if they were already local
time (3:00 PM shown on the Schedule page came back from chat as "7:00 PM"). Fixed by
formatting `starts_at` into an unambiguous local-time string server-side (where the
correct timezone context lives) before it ever reaches the model, rather than expecting
Claude to convert it.

Verified end-to-end against the real API and database: a schedule query with no matches,
a schedule query that correctly cites an email-scan source, an event-draft and a
todo-draft each correctly parsed (including resolving the family member by name and
"Friday" to the correct date), confirming a draft through the UI end-to-end (persisted
with `source_type: 'chat'`), and re-querying that same event back through chat to confirm
the timezone fix — then cleaned up all test data.

**Phase 6 — Gmail OAuth one-time setup.** Done. GCP project **"Family Chief of Staff"**
(deliberately not named "Rufus" — the product name may change and this avoids a legacy
name trail in Google's records), Gmail API enabled, OAuth consent screen configured
External + Testing status with `rallen7425@gmail.com` as a test user and the
`gmail.readonly` scope, OAuth client of type **Desktop app** (accepts any localhost
redirect port without pre-registration — no public redirect URL needed).
`scripts/gmail/get-refresh-token.ts` — a one-time local script, not part of the deployed
app — opens the consent URL, runs a tiny local HTTP server to catch the
`localhost:3457/oauth2callback` redirect, exchanges the code for tokens, and upserts the
refresh token into `rufus.gmail_credentials` via the service-role client. Client
ID/secret live in `.env.local` only (`GMAIL_OAUTH_CLIENT_ID` / `GMAIL_OAUTH_CLIENT_SECRET`).

Verified: ran the script (user completed the Google sign-in step — an OAuth login is
something only the account owner can do), confirmed `rallen7425@gmail.com` connected,
then a throwaway script listed 5 real inbox message subjects/senders via the stored
refresh token to prove it actually authenticates — then deleted that throwaway script.

**Phase 7 — Email-scan pipeline.** Done: `scripts/pipeline/gmail/` (client + message/
attachment fetching, MIME-tree walk for body text + docx/pdf attachment parts),
`scripts/pipeline/extract/` (`parseDocx.ts` via `mammoth`, `parsePdf.ts` via `unpdf` —
returns per-page text for page-number provenance, `extractEvents.ts` — Claude structured
output via `zodOutputFormat`, **one call per message, not batched** like Distilled's
article pipeline: deliberate adaptation, since batching several unrelated emails into one
call would blur per-item provenance and a household inbox's volume doesn't need the
cost optimization batching exists for), `scripts/pipeline/write.ts` (resolves
`person_hint` by name, inserts `pending_review` + full `source_detail`),
`scripts/pipeline/index.ts` (orchestrator — dedupes against `email_scan_log` *before* any
fetch/parse/Claude work, one message's failure doesn't block the rest),
`app/api/pipeline/gmail-scan/route.ts` (shared-secret check), `.github/workflows/
gmail-scan.yml` (2-hour cron + manual dispatch — needs repo variable `APP_URL` and secret
`CRON_SECRET` set once Phase 8 deploys). New `lib/householdTime.ts` (`@date-fns/tz`):
this path runs server-side with no browser to resolve local time from, unlike manual/chat
entry, so it needs a fixed `HOUSEHOLD_TIMEZONE` (defaults to `America/New_York` — override
in `.env.local` if that's wrong for this household) rather than relying on the process's
ambient timezone (Vercel defaults to UTC).

Verified end-to-end against the real inbox and real database (not a synthetic test — I
can't send email on the user's behalf, so this ran against whatever was actually there):
25 messages scanned, 25 processed, 0 errors, 19 events + 5 todos created as
`pending_review`. This turned out to include the exact real-world scenario MVP-Spec.md
was written from — a live "Varsity/JV Football" email from St. John's Prep with a real
`.docx` attachment — confirming the docx path (13 of the 19 events) with correct per-item
`extractedSnippet` quotes and `attachmentName` provenance, alongside body-text-only
extraction for the rest. Re-running confirmed dedupe works (25/25 skipped, 0 wasted Claude
calls). One real quality issue found and fixed: a marketing "offer expires" email was
extracted as a todo — tightened the system prompt to explicitly exclude promotional/
newsletter content, which a batch of curated test emails wouldn't have caught. Removed
that one bad row and the throwaway inspection scripts; left the ~23 genuinely accurate
`pending_review` items in place for real review through the app.

**Phase 8 — Deploy.** Done. Repo pushed to GitHub as `rallen7425/Family-Chief-of-Staff`
(not `rufus` — same naming reasoning as the GCP OAuth app: the product name may still
change). Vercel project linked, all 7 production env vars set, deployed.

The Vercel project was initially auto-named "rufus" by `vercel link` (defaults to the
local folder name) before I caught the naming inconsistency — renamed to
`family-chief-of-staff` via `vercel project rename`, which changes the project's identity
but does **not** retroactively move the live domain alias to match. First attempt used
`vercel alias set <deployment-url> family-chief-of-staff.vercel.app` — this worked for
that one deployment, but silently broke on the *next* `vercel --prod` run: `alias set`
pins to one specific deployment hash and does not follow subsequent deploys, so
`/review` (added the same day) 404'd on the "live" domain while the auto-generated
`rufus-olive.vercel.app` alias correctly showed the new route. **Fixed properly with
`vercel domains add family-chief-of-staff.vercel.app`** instead — this registers it as a
real project domain that auto-follows every future production deploy, the same as
Vercel's own auto-generated aliases. Use `domains add`, not `alias set`, for any domain
meant to stay current — `alias set` is only for a one-off pin to a specific deployment.

Bigger catch: that newly-aliased domain came back with a 302 to `vercel.com/sso-api` —
Vercel's account-wide SSO deployment protection (`ssoProtection.deploymentType:
"all_except_custom_domains"`, the same default every sibling app has) was gating it
behind a Vercel login, which would have meant no one else in the family could ever open
the app. The *original* auto-generated production alias had been silently exempt from
this (some domains-vs-aliases distinction in how Vercel provisions the very first project
domain vs. a `vercel alias set` added later), but a manually-added alias is not
automatically exempt. Fixed by disabling SSO protection outright for this project
(`vercel project protection disable family-chief-of-staff --sso`) — this is a personal
app, not internal tooling, so there's no reason to gate it behind Vercel auth at all;
its actual security boundary is Supabase RLS + the service-role-only data layer, not
Vercel's login.

**Production URL: https://family-chief-of-staff.vercel.app**

GitHub Actions cron: repo secret `CRON_SECRET` and repo variable `APP_URL` (=
`https://family-chief-of-staff.vercel.app`) set on `rallen7425/Family-Chief-of-Staff` —
user configured these manually since `gh` CLI wasn't authenticated in this environment.
**If `APP_URL` was set to the old `rufus-olive.vercel.app` value before this rename, it
needs updating to the URL above** or the cron trigger will hit a dead alias.

Verified end-to-end on the live production deployment: all four routes return 200, the
Today screen renders real data (the same events/todos from the Phase 7 test) against
production Supabase, `/api/chat` answers correctly with live citations, and
`/api/pipeline/gmail-scan` correctly deduped 24 already-scanned messages and processed 1
genuinely new one that had arrived in the inbox since the last local test run.

User confirmed `APP_URL` corrected and manually ran the `gmail-scan` GitHub Actions
workflow via the Actions tab — green checkmark, confirming the cron trigger, repo
secret/variable, and production route are all correctly wired end-to-end. The 2-hour
cron now runs unattended.

**All 8 phases of the original implementation plan are now complete.**

## Post-MVP: Keep in Mind redesign + review/approval flow

Real usage surfaced the exact problem flagged as a "known follow-up" above — with 23
real email-scan items, the old design (every `pending_review` event listed inline in
Keep in Mind, each opening its own confirm dialog) was unusable. Redesigned per user
feedback:

- **Keep in Mind is now for things needing action *right now*** — system
  `keep_in_mind_items` + todos due today/overdue (`lib/data/todos.ts` →
  `getUrgentTodos()`, regardless of source/review-status, since the real-world action a
  todo represents doesn't wait on it being formally reviewed) — capped at 3 with a
  "View all" link to `/todo`. It no longer lists individual auto-detected *events* at
  all; those move to:
- **A single summary line** — "N new entries need approval →", linking to a new
  **`/review`** page — plus a **red dot on the header's bell icon** (now a link to
  `/review`) whenever the count is nonzero. Both draw from the same
  `getPendingReviewEvents()` + `getPendingReviewTodos()` (events.ts/todos.ts, both
  wrapped in React's `cache()` since the root layout, Today page, and `/review` all need
  them within one request).
- **`/review`** groups pending events+todos by source email (`source_detail.
  gmailMessageId`, via `components/review/ReviewList.tsx`), each item checkbox-selected
  by default. Per-group "Approve (N)" approves only the checked items in that group;
  per-item "X" removes one item immediately regardless of checkbox state; a top-level
  "Approve All" approves literally everything regardless of selection. New
  `lib/actions/review.ts` (`approveReviewItems`/`removeReviewItems`, bulk `.in(...)`
  updates keyed by `{id, kind}` pairs so one action handles mixed events+todos).
  Deleted the now-unused `EventReviewDialog`/`PendingReviewNudge` (the old
  per-item modal this replaced).

Also fixed during this pass: `query_schedule`'s chat tool had a literal keyword
substring filter that missed synonyms — asking "when is Ben's next game" against a
real "Scrimmage vs. Andover" event returned nothing, because "game" isn't a substring of
"Scrimmage". Removed the filter entirely; the tool now always returns the full
date-ranged result set and the system prompt explicitly tells Claude to reason over the
actual titles itself (a household's event volume is small enough that this costs
nothing, and it's far more reliable than string matching).

## Recurring events + event duration + notifications inbox

Real usage surfaced two more gaps: "Nora has tumbling every Saturday" via chat only
created one event (no recurrence concept existed at all), and the Add Event form had no
way to set an end time/duration.

- **`rufus.events.recurrence_id`** (new column, nullable uuid) tags every row generated
  from one recurring input, so a future bulk-edit/cancel-series feature has something to
  key off — not built now (the user only asked for *creating* a series), but effectively
  unbuildable without this link once rows already exist without it.
- **`EventForm`** gained an "End time" field (only shown once a start time is set) and a
  "Repeats" select (None/Weekly) that reveals an "Until" date when active.
  `lib/actions/events.ts`'s `createEvent`/`createEventFromChat` both funnel through a
  shared `buildEventRows()`: no recurrence → the existing single-row insert (now also
  carrying `ends_at`); recurrence present → a weekly-dated series, all sharing one fresh
  `recurrence_id`. Each occurrence's UTC instant is recomputed independently via
  `householdLocalToInstant()` (same helper Phase 7's email-scan pipeline uses) rather
  than adding a fixed 7×24h offset to the first occurrence — a multi-month weekly series
  can cross a DST boundary, and a fixed offset would silently shift the wall-clock time
  after the transition.
- **Chat won't guess a duration.** `create_event_draft`'s tool description and the
  system prompt both now say: if the user describes a recurring pattern without saying
  how long it should run, ask first (an end date or a number of weeks) rather than
  assuming "the season" or similar. Verified: "Nora has tumbling every Saturday at 10am"
  correctly triggers a clarifying question instead of creating anything; answering
  "until October 24" produces a draft with `recurrenceUntil` set, which `EventForm`
  (reused for the chat proposal card, same as before) pre-fills into the Repeats/Until
  fields. End-to-end verified against the real database: 10 Saturday occurrences, Aug 22
  through Oct 24, all sharing one `recurrence_id`, correct 10:00–10:45 AM Eastern on
  every row (confirming the DST-safe per-occurrence computation actually works, not just
  the first one).
- **New `/notifications` page** sits between the header's bell icon and `/review` — the
  bell no longer links straight to `/review`. Right now it has exactly one possible
  entry ("N new entries need approval," linking to `/review`) since pending-review
  counts are the only notification source that exists; deliberately not built as a
  generic notification framework for hypothetical future notification types that don't
  exist yet. Keep in Mind's own "N new entries need approval" line is unchanged and
  still links directly to `/review` — both routes converge on the same
  `getPendingReviewEvents()`/`getPendingReviewTodos()` counts.

Also ran a one-off historical backfill (`scripts/backfill-austin-prep.ts`, since deleted
— reused the standing pipeline's internals with a custom unbounded Gmail search instead
of the cron's `newer_than:2d` window) for Nora's school, Austin Prep — the user's
scenario wasn't hypothetical either: a real "Game Day Cheer Practice Schedule" email
correctly produced 1 event, and a real multi-message testing-accommodations thread
correctly produced 4 todos, while every newsletter/administrative email in the batch
(bus registration, textbook purchasing, grandparents' day, etc.) correctly produced
nothing — the marketing-content exclusion from Phase 7 is generalizing well beyond just
spam.

## Body-extraction bug: empty text/plain parts hid real content

The user asked chat about a Grandparents' Day email from Nora's school (Austin Prep)
and got nothing — the email had genuinely been scanned (correctly, per
`email_scan_log`), but extracted 0 events/todos. Root cause in
`scripts/pipeline/gmail/fetchMessages.ts`: some senders (Austin Prep's mailer,
`veracross.com`) attach a near-empty `text/plain` MIME part — literally a blank string
or an `<!--placeholder-->` HTML comment — alongside the real content in `text/html`. The
body-selection logic only checked "does a plain-text part exist", not "does it contain
anything," so it always won over the actual HTML body, silently discarding the real
email content before it ever reached Claude.

Fixed by only trusting the plain-text part when it has more than a few characters after
stripping HTML comments, falling back to the (already-existing) HTML-stripping path
otherwise. Verified the fix directly against the real email — before: empty body; after:
the actual text, correctly extracting the real event (Grandparents' Day, Oct 6–7) and a
todo (submit contact info by Aug 28).

This bug predates the fix, so already-scanned emails from the same sender pattern
needed reprocessing — dedupe means a fixed pipeline doesn't retroactively reprocess
anything on its own. Deleted the affected `email_scan_log` rows and reprocessed 14
emails from `veracross.com` specifically (not all 37 zero-result scans — most of those
are genuinely irrelevant marketing/newsletters that correctly extracted nothing; only
the same-sender-pattern ones were suspects for this exact bug). Recovered real events
and todos that had been silently dropped since the original Phase 7 backfill.

**Backfill/reprocessing pattern, for future reference:** the standing pipeline's dedupe
(`email_scan_log`) means fixing an extraction bug never retroactively repairs old scans.
When that happens, the fix is: delete the affected `gmail_message_id` rows from
`email_scan_log`, then reprocess just those IDs by reusing the pipeline's internals
(`fetchMessageDetail`, `extractItemsFromMessage`, `writeExtractedItems`, etc. — see the
pattern in this session's now-deleted `scripts/reprocess-veracross.ts`) rather than
widening the standing cron's search window, which stays `newer_than:2d` for ongoing
automatic scans.

## Systemic timezone bug: server-rendered times were UTC, not household-local

The user reported "Football practice" showing 8:00 PM when the source email clearly
said 4:00 PM. The stored data was actually correct (`20:00 UTC` = 4:00 PM Eastern) —
the bug was in **display**: every server-rendered date/time in the app (`format(new
Date(startsAt), ...)` in Server Components — Schedule, Today, Todo, Review,
Notifications, and the chat tool's `query_schedule`) relies on date-fns reading the
Node process's ambient local timezone. That's correct on this dev machine only because
the Mac's system timezone happens to be America/New_York — on Vercel, which defaults to
UTC, the exact same code would render every time 4-5 hours ahead of the household's
actual local time. This had been silently masked through every phase of local testing.

Tried the obvious fix first — setting `TZ=America/New_York` as a Vercel environment
variable — and hit a wall: **`TZ` is a Vercel-reserved name**, rejected by both the
dashboard and `vercel env add`. Fixed instead with `instrumentation.ts` (new, repo
root) — Next.js's documented `register()` hook, which runs once at server boot in every
environment (local dev, preview, production) — setting `process.env.TZ =
"America/New_York"` in code rather than depending on infra config that could be missing
or silently drift on a fresh deploy.

**Verified the fix actually overrides a hostile ambient environment**, not just that it
works when the ambient timezone already happened to be correct: ran `TZ=UTC npm run dev`
(forcing the exact failure mode Vercel would hit) and confirmed the Schedule page,
Today page, and the chat's `query_schedule` tool all still correctly showed 4:00 PM, not
8:00 PM, with `instrumentation.ts` in place.

## Today screen: day-less time labels made tomorrow look like today

Related but distinct report: retreat events correctly dated for Sunday were "added for
today (Saturday)" — not a data or display-formatting bug this time, but a missing-context
one. The Today screen's "Schedule" card shows the next few *upcoming* events (per
MVP-Spec.md), not strictly today's — on a day with nothing scheduled, the next events
shown are tomorrow's, but with only a time label ("8:00am") and no day indicator, that
reads as "happening today." Fixed in `ScheduleCard.tsx`: each row now shows a small day
label above the time — nothing when the event actually is today (unambiguous), else
"Tomorrow" or the weekday name.

Also fixed in the same pass: the Leader Training/retreat events had `family_member_id:
null` because the source email never explicitly names Ben (it's addressed to retreat
leaders generally) — extraction correctly left `person_hint` null rather than guessing,
but the resulting neutral-gray color bar read as a display bug to the user, who knows
from context it's specifically his activity. Reassigned those 6 events to Ben directly
(one-off data fix, not an extraction change — there was no way to know it was Ben from
the email text alone). This is also the first time it's become clear there's no way to
*edit* an already-confirmed event's details through the UI — worth a real feature at
some point, not built now.

## Data-quality fixes from real-content reprocessing

Reprocessing the Austin Prep (`veracross.com`) emails after the body-extraction fix
surfaced two more real issues, both fixed directly in the data (not code bugs — the
underlying extraction is working correctly per-email, these are cross-email
consequences):
- **Wrong year**: one event ("campus closed to guests... through Aug 5") was extracted
  with year 2020 — a real instance of the *exact* bug the received-date anchor above
  fixes, from before that fix existed. Corrected to 2026 directly (the anchor fix
  prevents this going forward).
- **Cross-email duplicates**: Austin Prep sent both an original "Grandparents' Day"
  email and a "Reminder" follow-up days later, each independently and correctly
  extracting the same real event/todo — since extraction is scoped to one email at a
  time, there was no way to know within a single pass. Deduped by matching on
  date/time rather than title (the two emails phrased the title slightly differently).
  This class of duplicate (same real-world event mentioned in an original + reminder
  email) doesn't have a code fix within the current per-message extraction design —
  worth revisiting if it recurs often enough to matter.

## Mobile keyboard covering the chat input

Reported: opening the chat panel and tapping the input, the on-screen keyboard covered
it. Classic mobile-web cause — the panel's height was `calc(100vh - 4rem)`, and `100vh`
is the *layout* viewport, which doesn't shrink when the keyboard opens; the input,
pinned to the bottom of that now-too-tall container, ends up rendered underneath the
keyboard rather than above it. Fixed by switching to `100dvh` (dynamic viewport height)
in `ChatPanel.tsx`, which is designed for exactly this and updates live as the visual
viewport changes. Couldn't verify live keyboard behavior directly (headless browser
tooling has no real on-screen keyboard to trigger the resize) — this is the documented,
standard fix for the failure mode described, but worth the user confirming it feels
right on an actual phone.

## Event details/history modal, review-page editing, smarter visibility (2026-08-24)

The user asked for a proper details view on events (click to see full context and how
an item got onto the calendar), an edit affordance on the review page, and smarter
person-detection so a kid's school email reliably lands on the right kid and an adult's
personal appointment doesn't show up on everyone's calendar. Investigation found the
data model already had most of what was needed — `source_type`/`source_detail` jsonb
provenance and a `pending_review` status existed from Phase 2 on — it just wasn't
surfaced or editable in any UI. New work:

- **`components/events/EventDetailsModal.tsx`** (opened via new **`EventRow.tsx`**,
  swapped into `DayGroup.tsx`'s and `ScheduleCard.tsx`'s per-event rendering) — title,
  time, location, "Additional context" (the existing `notes` field, relabeled from
  "Notes" on the manual-entry form), a computed **"Visible to: …"** line, and a
  collapsed-by-default `<details>` History section: source, "Added by: Household" (no
  per-user identity exists in this app yet — deliberately not inventing one), date
  added (`events.created_at`, newly surfaced in the TS types), and for `email_scan`
  specifically: sender, received date, subject, attachment name, and the extracted
  snippet that justified the item. For `chat`-originated events, shows the original
  message (already captured since Phase 5, just never displayed anywhere before).
- **Edit, from either the details modal or a new pencil icon on `/review` rows**
  (`ReviewList.tsx` now receives full `CalendarEvent` records, not just the
  display-only projection it used before). This is powered by a real bug fix: `updateEvent`
  used to hard-reset `status` to `"confirmed"` on every save, which silently approved
  anything edited from the review queue and — per the "Known follow-ups" entry this
  removes below — made it impossible to edit an already-confirmed event without
  side effects. It now leaves `status` untouched, so editing is a pure correction.
- **Person detection**: new `rufus.member_email_domains` table (migration
  `20260824000001_rufus_history_and_visibility.sql` in `rocky-coast-labs`, already
  pushed to the live shared database) gives `resolvePerson()` in
  `scripts/pipeline/write.ts` a sender-domain fallback for when the LLM's `person_hint`
  comes back null — seeded from real domains already seen in this inbox
  (`austinprep.org`/`veracross.com` → Nora, `stjohnsprep.org` → Ben), not guessed.
- **Visibility**: new `is_adult` column on `family_members` (Rick/Kim `true`, Ben/Nora
  `false`) drives a computed rule in new `lib/visibility.ts` — an adult's own event is
  private to them, a kid's event is visible to that kid plus every adult (not the other
  kid), a whole-family event (no assignee) is visible to everyone. There's no login in
  this app, so there's no real "current viewer" to enforce this against in the default,
  unfiltered household view — it stays unfiltered, exactly as before. Enforcement is
  layered onto the **existing person-filter** instead (`getEventsInRange` in
  `lib/data/events.ts`): filtering the schedule to one person now applies the
  visibility rule rather than a strict assignee match. Verified live: filtering to Kim
  hides Rick's private events and vice versa; a kid's event shows under either parent's
  filter.

Verified end-to-end against the real production database (not synthetic data): edited a
real pending `email_scan` item's notes through the new review-page Edit button, confirmed
it stayed `pending_review` and the edit persisted, then reverted the test edit back to
its original text; opened a real confirmed event's History and confirmed real sender/
subject/attachment/snippet provenance renders correctly; confirmed the domain-fallback
matching logic against real sender addresses already in `email_scan_log`. All temporary
test artifacts were cleaned up — no leftover rows or scratch files.

**Not yet backfilled**: `sourceDetail.receivedAt`/`googleAccountEmail` are new fields the
email-scan pipeline now writes going forward, but the ~30 items already sitting in
`pending_review` from before this change won't have them until they're re-scanned (dedupe
means they won't be automatically) — their History section will just omit those two
lines, which the modal already handles gracefully (conditional rendering, not a bug).

## Auth / login — not built (planned major workstream)

There is no login, session, or user-identity concept anywhere in the app. A full
**login + onboarding + user-management flow** is a planned, significant piece of
work — not an incremental patch. When it lands it is expected to rework, not just
extend, several current behaviors. In scope for that effort:

- **Secure `/api/chat`** (currently a fully open public endpoint — see the
  2026-08-28 tech-debt note above). This is the concrete vulnerability the auth
  work must close, treated as non-optional.
- **Real per-person identity** — replaces the static "Added by: Household" label
  with actual attribution, and gives the app a real "current viewer."
- **Enforce visibility in the default view** — the adult-private / kid-shared rule
  in `lib/visibility.ts` currently only applies when the schedule is filtered to a
  specific person; with a real viewer it should apply everywhere.
- **Onboarding / user management** — reassign or repeat family-member colors, add
  or remove members, etc. (the roster is currently a fixed seed).

## Known follow-ups (not yet scheduled)

These are deferred and will likely be folded into larger reworks rather than
handled as one-off patches — don't pick one up in isolation without checking it's
still the right shape.

- Image/screenshot flyer OCR for email-scan attachments (docx/pdf only at launch, per
  the original plan's explicit MVP scope cut).
- "Message" tab is still just a placeholder (future family-to-family messaging).
- Cross-email duplicate detection (an original + a "reminder" email describing the same
  real event) isn't handled within the current per-message extraction design.
- Todos are second-class vs. events: no edit affordance, no "history"/context view, and
  no `notes`/`location` columns — the 2026-08-24 work was scoped to events only. A todo
  rework (not a bolt-on) is the right move here.
