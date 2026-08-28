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

## Session status (2026-08-28)

Two pieces of work, both cleanup before any new functionality:

**1. Gmail-scan pipeline was timing out (fixed, committed `3dc161d`, not yet
deployed).** A scheduled run on 2026-08-27 hit the route's 60s `maxDuration` and
the Vercel function 504'd — the per-message loop was fully sequential (Gmail fetch
+ attachment parse + one Claude call each) and a burst of ~19 new emails couldn't
finish in time. Fix in `scripts/pipeline/index.ts`: process at most 8 not-yet-seen
messages per run (rest deferred to the next 2-hour tick, which picks them up
because they stay unlogged), 4-way concurrent instead of sequential, oldest-first
so a backlog drains in order, and one batched dedupe query instead of one per
message. Also pinned `maxDuration = 60` on the chat route and refreshed obsolete
comments in the workflow file. Verified against the real inbox: 8 messages in
6.8s, 0 errors. **Still needs `git push` + `vercel --prod`.**

**2. "Rufus" infra-naming audit.** The 2026-08-25 rename missed several spots
because `ALTER SCHEMA … RENAME` doesn't rename objects inside the schema, and
because a few external surfaces aren't covered by a migration. Full findings and
fixes:

| Where | Was | Now |
|---|---|---|
| 5 Postgres indexes (`idx_rufus_events_starts_at`, `_events_person`, `_events_status`, `_todos_person`, `_events_recurrence_id`) | still named `idx_rufus_*` | renamed to `idx_family_chief_of_staff_*` via `rocky-coast-labs/supabase/migrations/20260828000001_rename_rufus_indexes.sql` |
| `_meta.apps` notes | stale local path `…/Projects/rufus`, false "alias removed" claim | corrected in the same migration |
| Vercel alias `rufus-olive.vercel.app` | live, served production | removed — see note below |
| GitHub repo "About" website link | `https://rufus-olive.vercel.app` | `https://family-chief-of-staff.vercel.app` |
| `.vercel/project.json` `projectName` | `"rufus"` (stale local CLI cache) | `"family-chief-of-staff"` |
| `CLAUDE.md` header | `# Rufus — CLAUDE.md` | renamed + explicit infra-naming rule added at top |

**Confirmed already clean:** app code (`git grep -i rufus` → only the intentional
`lib/config.ts` `ASSISTANT_NAME`), Postgres schema name, Vercel project name,
GitHub repo name, GitHub Actions secrets/vars, `package.json`. **Deliberately left
as historical record:** git commit messages, the applied `rocky-coast-labs`
migration filenames (`*_rufus_*.sql` — renaming applied migrations breaks the
version tracker), and `docs/design/*` planning docs (a rename banner was added to
`IMPLEMENTATION-PLAN.md`; the body is the plan as it stood on 2026-08-22).
**Needs the user in a console (can't verify from here):** GCP project / OAuth
client name — believed "Family Chief of Staff" per Phase 6, worth a glance.

**Removing the `rufus-olive.vercel.app` auto-alias took two steps, not one**
(same family of gotcha as the "alias set vs domains add" note in Phase 8 below).
`vercel alias rm rufus-olive.vercel.app` removed the live pointer, but the domain
was still attached to the project, so the very next `vercel --prod` re-aliased it
(visible as `▲ Aliased https://rufus-olive.vercel.app` in the deploy output). The
real fix was removing it in the dashboard: **Project → Settings → Domains →
remove `rufus-olive.vercel.app`**, and confirming `family-chief-of-staff.vercel.app`
is marked the Production domain. Verified with a fresh `vercel --prod` afterward —
the deploy aliased only `family-chief-of-staff.vercel.app`, and `rufus-olive`
returns 404. (CLI `vercel project ls` still prints `rufus-olive.vercel.app` as the
"Latest Production URL" — that's a stale cache in the pinned old CLI v54, not a
real remaining attachment; the dashboard and `vercel inspect <deployment>` both
show only the correct domains.)

**End state — all live and verified 2026-08-28:** pipeline timeout fix deployed
(routes 200, `/api/pipeline/gmail-scan` returns 401 without the secret), index
rename migration pushed to GitHub and applied to the shared DB, both repos in sync
with `origin/main`, no `rufus` anywhere in infrastructure. The Gmail-scan cron's
next run (or a manual workflow dispatch) will be the first live exercise of the
new capped/parallel pipeline.

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

## Known follow-ups (not yet scheduled)

- Image/screenshot flyer OCR for email-scan attachments (docx/pdf only at launch, per
  the original plan's explicit MVP scope cut).
- "Message" tab is still just a placeholder (future family-to-family messaging).
- Cross-email duplicate detection (an original + a "reminder" email describing the same
  real event) isn't handled within the current per-message extraction design.
- Todos don't have an edit affordance or a "history"/context view like events now do
  (todos also don't have a `notes`/`location` column at all yet) — the 2026-08-24 work
  was scoped to events only, per what was actually asked for.
- "Added by: Household" in the new History section is a static label, not real
  per-person attribution — there's no user-identity concept in this app yet. Real
  attribution should come with actual user management/profile-switching, not a
  standalone `added_by` column bolted on ahead of it.
- The new visibility rule (adult-private vs. kid-shared) is only enforced when the
  schedule is filtered to a specific person — the default unfiltered "All" view still
  shows everything to everyone, since there's no real "current viewer" to enforce
  privacy against without a login concept.
