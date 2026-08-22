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

**Phase 0 — Scaffolding & tokens.** Done: `create-next-app`, design docs moved into
`docs/design/`, Tailwind v4 tokens, fonts, layout shell (header + tab row + inert chat
bar), empty route shells for `/`, `/schedule`, `/todo`; `/message` built to its final
placeholder form since that's in scope for the whole MVP. No Supabase/data wiring yet.

Next: **Phase 1 — Static UI, dummy data.**
