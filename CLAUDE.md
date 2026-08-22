@AGENTS.md

# Rufus — CLAUDE.md

**Working name:** Rufus (chief-of-staff chat identity). Product name TBD.

---

## Session status (paused 2026-08-22)

All 8 build phases are complete and deployed. Since then, the user has been doing
real-world usage testing (their own account, real Gmail inbox, real production database)
and reporting concrete bugs/gaps one at a time, each investigated to root cause, fixed,
verified against real data, and deployed. Session paused here while the user does a
hands-on functional review; no specific area was flagged going in — next session should
start by asking what they found, rather than assuming any of the items below still need
work.

**Fixed and deployed this session** (see the dated sections below for full detail):
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
| Database | Supabase (Postgres) | Shared `rocky-coast-labs` project, schema `rufus` — **no auth**, single service-role client, no browser client |
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
`rufus`. Migrations/RLS/grants live in the separate `rocky-coast-labs` repo, not here —
see its `ARCHITECTURE.md` for the platform-wide convention (one Supabase project, one
schema per app). This app only ever queries its own `rufus` schema via `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (server-only, never shipped to the browser) — no anon key, no
browser Supabase client, no session/cookie handling, since there's no login concept.

**Family roster (seeded):** Rick (Dad, coral) · Kim (Mom, teal) · Ben (gold) · Nora
(berry). A future onboarding/user-management flow will let colors be reassigned or
repeated.

**Event/todo provenance:** every row stores `source_type` (`manual` | `chat` |
`email_scan`) and `source_detail` (jsonb) so the user can trace where information came
from, and so the chat can cite sources when answering questions. Auto-detected
(email-scan) events/todos are inserted immediately with `status: 'pending_review'` — not
held in a blocking queue — and surfaced as a review nudge on the Today screen.

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

## Known follow-ups (not yet scheduled)

- Image/screenshot flyer OCR for email-scan attachments (docx/pdf only at launch, per
  the original plan's explicit MVP scope cut).
- "Message" tab is still just a placeholder (future family-to-family messaging).
- No way to edit an already-confirmed event/todo's details through the UI (surfaced
  when the Leader Training events needed a manual person reassignment) — only
  create-new and the pending-review approve/edit/remove flow exist today.
- Cross-email duplicate detection (an original + a "reminder" email describing the same
  real event) isn't handled within the current per-message extraction design.
