# Rufus — Family Chief of Staff — Implementation Plan

> **Historical document.** This is the plan as it stood on 2026-08-22, kept for
> reference. Its infrastructure names are out of date: the working name "Rufus"
> was later removed from all infrastructure — the Postgres schema is
> `family_chief_of_staff` (not `rufus`), the local folder / Vercel project /
> GitHub repo are `family-chief-of-staff` / `Family-Chief-of-Staff`, and "Rufus"
> now survives only as the in-UI assistant name (`ASSISTANT_NAME` in
> `lib/config.ts`). See `CLAUDE.md` for the current state and the naming rule.

## Context

Design/spec work for this app (working name **Rufus**) has already been drafted at `rocky-coast-labs/apps/Family OS App/` (`MVP-Spec.md`, `Design-System.md`, `Family OS - Calendar.md`, `Design Concepts/`) but no code exists yet. The goal now is to turn that spec into a real, deployed app: a single-household assistant with a Today dashboard, a full Schedule/calendar, a Todo list, and a persistent AI chat bar ("Chat with Rufus") that can answer questions and create events/todos from natural language — plus a background pipeline that scans Gmail for schedule-relevant content (body text and docx/pdf attachments, e.g. a coach's season schedule) and adds detected events/todos automatically, flagged for the user to review afterward.

Rufus reuses the shared `rocky-coast-labs` infrastructure already proven by three sibling apps (Distilled, PM ReArchitected, Sonic Radar): one shared free-tier Supabase project, one Postgres schema per app, Vercel Hobby hosting, GitHub Actions for scheduled/cron work (to avoid Vercel Pro's cron limits). Distilled's existing ingestion-pipeline pattern (GitHub Actions cron → Vercel API route → Claude extraction, dedupe-before-AI-call) is the direct template for the Gmail-scan feature. PM ReArchitected's no-auth Supabase client pattern (single service-role client, schema-scoped, no browser client, no session handling) is the direct template for Rufus's data layer, since **the MVP has no login/auth system** — single household, single implicit user.

### Decisions locked in during planning

- **Repo:** brand-new standalone repo (not inside the rocky-coast-labs Turborepo — that structure is reserved for the Rocky Coast Guide app family, which shares code; Rufus doesn't).
- **Design tokens:** `Design-System.md` is authoritative. `Design Concepts/` (including its `DESIGN.md`, a conflicting warm-sage/Material-3 token set) is reference-only — ignore its tokens. `Design Concepts/stitch_Today_Mobk-up/code.html` and `screen.png` **are** built on the real `Design-System.md` tokens and are the concrete Today-screen layout reference.
- **Primary color:** blue (`#3B6FE5`), matching what's already built in the mockup.
- **Icons:** `lucide-react` (matches the written "line-style SVG, 2px stroke" spec; avoids loading Material Symbols as an extra font).
- **"Message" tab:** placeholder screen only — this is a future family-to-family messaging feature, unrelated to and separate from the AI chat. The persistent chat bar ("Chat with Rufus") is the real MVP chat feature and lives on every screen, not behind the Message tab.
- **Auto-detected events (email scan):** auto-added to the calendar immediately, not held in a blocking pre-approval queue — marked with a `status` field (`pending_review`) surfaced as a nudge on the Today screen. No separate review-queue table. Every event/todo, regardless of source, stores provenance (`source_type` + `source_detail`) so the user can trace where it came from and so the chat can cite sources when answering questions.
- **Family roster (seed data):** Rick (Dad) / Kim (Mom) / Ben / Nora, one of coral/teal/gold/berry each. A future onboarding/user-management flow (post-MVP) will let colors be reassigned or repeated — the data model already supports repeats (`accent_color` is just a column, not unique).
- **Gmail account:** `rallen7425@gmail.com`, read-only scope, Gmail only — **no Google Calendar sync** in MVP (confirmed explicitly; Rufus's own Schedule is the calendar of record).
- **Design docs:** moved (not copied) into the new repo as part of scaffolding.

### Defaults set for lower-stakes items (flag if you want these changed before/during build)

- Email-scan cron cadence: every 2 hours (vs. Distilled's hourly — a household inbox has far lower volume/urgency).
- Attachment parsing at launch: docx + pdf only; image/screenshot flyers (a real pattern MVP-Spec.md calls out) deferred post-MVP.
- Email-scan detects both event-shaped and todo-shaped content (e.g. "permission slip due Monday"), not events only — matches the spec's knowledge-base requirement.
- GCP OAuth app can stay in "Testing" publishing status initially; if Google's refresh-token expiration proves too short for an unverified app, move it to "In production" publishing status (fine for personal restricted-scope use) — verify empirically during Phase 6, not a blocker now.

---

## Repo & stack

- New standalone repo at `/Users/rallen/Documents/Claude/Projects/rufus/` (GitHub `rallen7425/rufus`, Vercel project `rick-allen-s-projects/rufus`), flat structure (repo root = app root, mirrors Distilled, not PM ReArchitected's nested layout).
- Next.js (App Router) + TypeScript + Tailwind CSS, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `ws` (Node <22 WebSocket polyfill `supabase-js` needs even without Realtime — see `PMRearchitected/pm-rearchitected/src/lib/supabase.ts`), `lucide-react`.
- `docs/design/` — moved-in copies of `MVP-Spec.md`, `Design-System.md`, `Family OS - Calendar.md`, `Design Concepts/` (kept as reference, not deleted content — just relocated from `rocky-coast-labs/apps/Family OS App/`).
- `CLAUDE.md` modeled on Distilled's/PM ReArchitected's: stack table, deployment info, design-system pointer, data-layer summary, a "current build phase" tracker updated after each phase below.

---

## Data model

New migration in the **rocky-coast-labs** repo (migrations live there per platform convention, not in Rufus's own repo): `rocky-coast-labs/supabase/migrations/20260822000001_rufus_schema.sql`.

```sql
CREATE SCHEMA IF NOT EXISTS rufus;

CREATE TABLE rufus.family_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  accent_color  text not null check (accent_color in ('coral','teal','gold','berry')),
  avatar_url    text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

CREATE TABLE rufus.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  family_member_id  uuid references rufus.family_members(id) on delete set null,
  category          text,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  all_day           boolean not null default false,
  location          text,
  notes             text,
  status            text not null default 'confirmed'
                     check (status in ('pending_review','confirmed','dismissed')),
  source_type       text not null check (source_type in ('manual','chat','email_scan')),
  source_detail     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
CREATE INDEX idx_rufus_events_starts_at ON rufus.events (starts_at);
CREATE INDEX idx_rufus_events_person ON rufus.events (family_member_id);
CREATE INDEX idx_rufus_events_status ON rufus.events (status) WHERE status = 'pending_review';

CREATE TABLE rufus.todos (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  family_member_id  uuid references rufus.family_members(id) on delete set null,
  due_date          date,
  completed         boolean not null default false,
  completed_at      timestamptz,
  status            text not null default 'confirmed'
                     check (status in ('pending_review','confirmed','dismissed')),
  source_type       text not null check (source_type in ('manual','chat','email_scan')),
  source_detail     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
CREATE INDEX idx_rufus_todos_person ON rufus.todos (family_member_id);

CREATE TABLE rufus.keep_in_mind_items (
  id                uuid primary key default gen_random_uuid(),
  body              text not null,
  icon              text,
  family_member_id  uuid references rufus.family_members(id) on delete set null,
  dismissed         boolean not null default false,
  source_type       text not null default 'manual' check (source_type in ('manual','chat','email_scan','system')),
  source_detail     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

CREATE TABLE rufus.gmail_credentials (
  id                    smallint primary key default 1 check (id = 1),
  google_account_email  text not null,
  refresh_token         text not null,
  access_token          text,
  token_expiry          timestamptz,
  scopes                text,
  connected_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

CREATE TABLE rufus.email_scan_log (
  id                uuid primary key default gen_random_uuid(),
  gmail_message_id  text not null unique,
  thread_id         text,
  sender            text,
  subject           text,
  received_at       timestamptz,
  processed_at      timestamptz not null default now(),
  events_created    int not null default 0,
  todos_created     int not null default 0,
  status            text not null default 'processed' check (status in ('processed','skipped','error')),
  error_detail      text
);

-- RLS enabled with zero anon/authenticated policies = deny by default.
-- No browser Supabase client exists in this app; all access is server-side
-- via the service-role client, which bypasses RLS entirely.
ALTER TABLE rufus.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus.keep_in_mind_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus.gmail_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus.email_scan_log ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA rufus TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA rufus TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA rufus GRANT ALL ON TABLES TO service_role;
```

Post-migration (per `rocky-coast-labs/ARCHITECTURE.md`'s onboarding checklist):
- Add `"rufus"` to `schemas` in `rocky-coast-labs/supabase/config.toml` — review `[auth]`/`[storage]` sections first before `supabase config push` (it pushes the whole local config, not just the schema diff — documented gotcha, bit another app before).
- Add a row to `_meta.apps`: `name='Rufus'`, `schema_name='rufus'`, `vercel_project='rick-allen-s-projects/rufus'`, `github_repo='rallen7425/rufus'`, `stage='prototype'`.
- Seed `rufus.family_members` with Rick/coral, Kim/teal, Ben/gold, Nora/berry (order/exact color-to-person mapping can be adjusted at seed time — no other constraint besides one of the four values).

---

## Screens / routes

Root layout renders the persistent chat bar + header + tab row on every screen.

- `app/layout.tsx` — fonts (`next/font/google`: Bricolage Grotesque + Instrument Sans), `ChatProvider`, `AppHeader`, `TabPillRow`, `ChatBar` + `ChatPanel`.
- `app/page.tsx` — **Today** (`/`): `KeepInMindCard` (reminders + `pending_review` event nudges), `ScheduleCard` (next few items, links to `/schedule`), `NeedsDoingCard` (top incomplete todos, links to `/todo`).
- `app/schedule/page.tsx` — **Schedule**, `?view=day|3day|week|month&date=YYYY-MM-DD&person=<id|all>`: `ViewModeSwitcher`, `DateNav`, shared `PersonFilter`, `DayView`/`ThreeDayView`/`WeekView`/`MonthView`, `AddEventDialog`+`AddEventForm` (title, person, date/time, location, notes per MVP-Spec's exact fields), `EventReviewDialog` (confirm/edit/dismiss a `pending_review` event, shows provenance).
- `app/todo/page.tsx` — **Todo**: same pattern as Schedule — list + `PersonFilter` (reused) + add (`AddTodoDialog`/`AddTodoForm`).
- `app/message/page.tsx` — **Message**: placeholder-only ("coming soon"), no backend.
- `components/chat/ChatBar.tsx` / `ChatPanel.tsx` / `ChatProvider.tsx` — always-visible floating pill; expands into a panel with conversation + structured proposal cards (Confirm/Edit/Cancel); client context so chat state survives tab navigation.

Data access — Server Components query directly (no client-side fetching, no auth boundary to route around): `lib/data/events.ts`, `todos.ts`, `keepInMind.ts`, `familyMembers.ts`.

Mutations as Server Actions: `lib/actions/events.ts` (`createEvent`, `updateEvent`, `reviewEvent`), `lib/actions/todos.ts` (`createTodo`, `toggleTodo`), `lib/actions/keepInMind.ts` (`dismissKeepInMindItem`).

---

## Three data-ingestion paths

1. **Manual** — form → Server Action → `source_type:'manual'`, `status:'confirmed'`.
2. **Chat/NL** (synchronous, confirm-before-save) — `ChatBar` → `/api/chat` → Claude proposes a structured event/todo via tool-use → `ChatPanel` shows a proposal card → user confirms → Server Action inserts with `source_type:'chat'`, `source_detail:{message, conversation_id}`, `status:'confirmed'`.
3. **Email scan** (async, auto-add + flag) — GitHub Actions cron → `/api/pipeline/gmail-scan` (shared-secret header) → fetch new Gmail messages → parse body + docx/pdf attachments → Claude extraction → insert directly with `status:'pending_review'` + full provenance (`gmail_message_id`, `thread_id`, `sender`, `subject`, and for attachments: `attachment_name`, `attachment_page`, `extracted_snippet`) → log to `email_scan_log` for dedupe (mirrors Distilled's dedupe-before-AI-call optimization). No pre-save confirmation on this path — review happens afterward via the Today-screen nudge.

---

## AI / chat architecture

`app/api/chat/route.ts` (POST `{ message, history? }`):
1. System prompt (`lib/chat/systemPrompt.ts`) includes current date + family roster (names/colors from `rufus.family_members`).
2. Claude call (`@anthropic-ai/sdk`) with three tools (`lib/chat/tools.ts`):
   - `query_schedule(person?, date_range?, keyword?)` — executes a filtered Supabase query and returns matches **including `source_detail`**, so answers can cite provenance ("per the email from Coach St. Pierre on Aug 20…").
   - `create_event_draft(...)` / `create_todo_draft(...)` — return a draft only, no DB write; `ChatPanel` renders Confirm/Edit/Cancel, Confirm triggers the real Server Action insert.
3. No vector store/embeddings for MVP — single-household event/todo volume is small enough for direct structured queries; revisit only if that stops being true.

Email-scan extraction (`scripts/pipeline/extract/extractEvents.ts`) reuses the same Anthropic client but Distilled's batched-JSON-array-in-a-text-prompt style (not tool-use — this path runs unattended, not interactively).

---

## Env vars

| Var | Used by |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | server-side data access, actions, pipeline (no anon key needed — no browser Supabase client at all) |
| `ANTHROPIC_API_KEY` | `/api/chat`, pipeline extraction |
| `GMAIL_OAUTH_CLIENT_ID` / `GMAIL_OAUTH_CLIENT_SECRET` | one-time local script + runtime token refresh |
| `CRON_SECRET` | `/api/pipeline/gmail-scan` + GitHub Actions workflow (mirrors Distilled's `x-cron-secret`) |

No `NEXT_PUBLIC_*` vars — nothing runs in the browser that talks to Supabase or Google directly.

---

## Phased build order

Narrow, testable phases; commit and update `CLAUDE.md`'s build-phase tracker after each.

- **Phase 0 — Scaffolding & tokens.** `create-next-app`, move design docs into `docs/design/`, Tailwind tokens from `code.html` (blue primary, coral/teal/gold/berry accents), fonts, `CLAUDE.md`, empty route shells + layout (header/tabs/inert chat bar). No data.
- **Phase 1 — Static UI, dummy data.** Today/Schedule (all 4 view modes)/Todo built against in-memory mock data, matching `screen.png`/`code.html`. Chat bar visually present, non-functional.
- **Phase 2 — Supabase infra.** Push the migration above, update `config.toml` (+`config push`, review auth/storage first), `lib/supabase.ts` service client (`db:{schema:'rufus'}`), seed the four family members with their colors, verify seeded rows are readable and that an anon-key request is correctly denied by RLS.
- **Phase 3 — Wire real data.** Replace Phase 1 dummy arrays with `lib/data/*.ts` queries; handle empty states.
- **Phase 4 — Manual CRUD.** Add/edit dialogs + Server Actions, todo toggle, `EventReviewDialog` (test against a couple of manually-flipped `pending_review` rows).
- **Phase 5 — Chat/NL.** `/api/chat`, tool-use wiring, `ChatProvider`/`ChatPanel` proposal-and-confirm UI.
- **Phase 6 — Gmail OAuth one-time setup.** GCP project + OAuth client (`gmail.readonly` scope, `rallen7425@gmail.com` as test user), `scripts/gmail/get-refresh-token.ts` (local one-off consent flow → writes refresh token into `rufus.gmail_credentials`).
- **Phase 7 — Email-scan pipeline (highest risk, last).** `scripts/pipeline/gmail/fetchMessages.ts` (googleapis, dedupe via `email_scan_log` before calling Claude), `fetchAttachments.ts`, `extract/parseDocx.ts` (mammoth), `extract/parsePdf.ts` (a library that supports per-page text, for attachment-page provenance), `extract/extractEvents.ts` (Claude, batched), `write.ts` (resolve person by name → `family_member_id`, insert `pending_review` + provenance), `app/api/pipeline/gmail-scan/route.ts`, `.github/workflows/gmail-scan.yml` (2-hour cron + manual dispatch). Test against MVP-Spec.md's real coach's-email example.
- **Phase 8 — Deploy.** Link Vercel, set prod env vars, first deploy, add `_meta.apps` row, point the GitHub Actions cron at the prod URL, smoke-test end to end.

---

## Verification

- Every phase: `npm run build` clean before moving on.
- Phase 0/1: visual compare against `screen.png`; all 4 Schedule views render without console errors.
- Phase 2: seeded rows readable via service client; anon-key request confirmed blocked by RLS.
- Phase 3: empty + populated states both correct; person filter narrows correctly.
- Phase 4: create event/todo manually, reload, confirm persistence; toggle todo survives reload; manually-flipped `pending_review` row surfaces correctly and confirm/edit/dismiss all work.
- Phase 5: "when is [Ben/Nora]'s soccer game" against seeded test data returns a correct, cited answer; "[person] has [event] at [time]" produces a correctly-parsed proposal, confirming it writes `source_type:'chat'` with the original message in `source_detail`.
- Phase 6: refresh token stored; a throwaway script lists recent inbox messages using it, proving the token actually authenticates.
- Phase 7: trigger manually against a real test email with a docx/pdf attachment; confirm both body-text and attachment-derived events land as `pending_review` with correct provenance (including attachment name/page/snippet); re-run and confirm dedupe (no reprocessing, Gmail read-state untouched).
- Phase 8: click through all tabs on the deployed URL; confirm the cron workflow fires successfully against production.

Use the `run` skill / browser preview for click-through verification during each UI-facing phase rather than re-deriving a testing approach from scratch.
