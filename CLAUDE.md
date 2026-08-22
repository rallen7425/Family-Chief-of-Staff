@AGENTS.md

# Rufus — CLAUDE.md

**Working name:** Rufus (chief-of-staff chat identity). Product name TBD.

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

Next: **Phase 5 — Chat/NL** (`/api/chat`, Claude tool-use for `query_schedule` /
`create_event_draft` / `create_todo_draft`, `ChatProvider`/`ChatPanel` proposal-and-confirm
UI on the persistent chat bar).
