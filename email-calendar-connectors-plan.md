# Email + Calendar Connectors — Plan

## 1. Grounding: what exists today

Verified directly against the live repo and the shared `rocky-coast-labs` Supabase schema before designing anything (see the full survey in the session that produced this doc for exact file:line citations).

- **`gmail_credentials` is a hard singleton**: `id smallint primary key default 1 check (id = 1)`. The database physically rejects a second row. This is the root blocker — nothing else here is possible until it's replaced.
- **No FK from any credential to a family member.** `/settings/accounts` fakes per-member attribution today by string-matching `google_account_email` against `family_members.email` at render time — cosmetic, not a real relationship.
- **OAuth is a local one-time CLI script** (`scripts/gmail/get-refresh-token.ts`) run by hand on a laptop — not an in-app flow. It can't be how a second person, let alone a second provider, connects.
- **Zero provider abstraction.** `scripts/pipeline/index.ts` imports Gmail-specific functions (`getGmailClient`, `listRecentMessageIds`, `fetchMessageDetail`, `fetchAttachmentBuffer`) directly by name. There is no interface a Microsoft implementation could satisfy — this is a from-scratch design, not an extension point.
- **`email_scan_log` has no mailbox/connection identifier column** — fine with one mailbox, unworkable with N (can't scope dedupe, audit, or reprocessing to a specific connection).
- **No calendar integration exists at all**, Google or Microsoft. The app's own `entries` table is the only "calendar." `googleapis`'s `calendar_v3` is never instantiated anywhere in the codebase.
- **Tokens are stored in plaintext** (`refresh_token`, `access_token` columns), behind RLS-denied-to-everyone-but-service-role. Acceptable for the current single-inbox, personal-use posture; not acceptable once this becomes N connections with calendar write access (see §5).
- **The good news**: `resolvePerson`/`resolveByDomain` (`scripts/pipeline/write.ts`) are already pure, provider-agnostic functions — a name hint plus a family-member list, no Gmail dependency. This layer ports forward unchanged.
- **Cron/runtime**: one GitHub Actions schedule → one `curl` → one route (`app/api/pipeline/gmail-scan/route.ts`), one shared secret, `maxDuration = 60`, capped at 8 messages/run. Sized for exactly one inbox. Vercel's platform default function timeout is now 300s (not 60–90s), which gives real headroom to fix this without inventing a queue — see §7.
- **No test coverage on the Gmail-specific wiring** (client construction, message fetch) — only the pure downstream extraction/dedupe/resolution logic is tested.

## 2. Scope decisions locked in

**Tenancy — this stays a single-household app; full multi-tenancy is explicitly out of scope for this plan, but the new schema is designed not to block it later.** The entire rest of the codebase (one Supabase schema, no login, `fcos_active_member` cookie) already assumes one household — retrofitting real multi-household isolation (per-household RLS, real accounts, a `households` table threaded through every existing table) is a separate, much larger initiative than "add connectors," and is the same deferred **Auth / login** workstream CLAUDE.md already tracks. What this plan does concretely to avoid foreclosing that later: every new table is keyed by `family_member_id` (never a global singleton), nothing hardcodes "the one shared inbox," and table/column naming stays generic (`email_connections`, not `gmail_credentials`) so a future `household_id` column is an additive migration, not a rename-everything exercise.

**Calendar sync — full two-way sync, not read-only-first.** Pulling external events in, and pushing app-created/edited events back out, both ship as part of the calendar phase, with an explicit conflict-resolution rule (§6) rather than deferring push to an unspecified later date.

**Token security — encrypt at rest now**, as part of the Phase 0 schema rebuild (the credentials table is being rebuilt anyway, so this is the cheap time to do it). App-level envelope encryption, not a new infra dependency (see §5).

## 3. Target data model

New table, replacing `gmail_credentials` (migration lives in `rocky-coast-labs`, applied to `family_chief_of_staff` schema, same RLS/grants posture as every other table there — RLS on, zero anon/authenticated policies, service-role-only):

```sql
CREATE TABLE family_chief_of_staff.email_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id      uuid NOT NULL REFERENCES family_chief_of_staff.family_members(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  external_account_email text NOT NULL,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'needs_reconnect', 'disconnected')),
  email_enabled         boolean NOT NULL DEFAULT true,
  calendar_enabled      boolean NOT NULL DEFAULT false,
  scopes                text[] NOT NULL,
  refresh_token_enc     bytea NOT NULL,   -- AES-256-GCM ciphertext, see §5
  access_token_enc      bytea,
  token_expiry          timestamptz,
  last_synced_at        timestamptz,
  last_error            text,
  connected_at          timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_account_email)  -- one mailbox can't be claimed by two members at once
);

CREATE INDEX idx_family_chief_of_staff_email_connections_member
  ON family_chief_of_staff.email_connections (family_member_id);
```

`gmail_credentials`'s single row migrates in as one real `email_connections` row (`provider='google'`, `family_member_id` = whoever the HoH decides owns it, `email_enabled=true`, `calendar_enabled=false` until Phase 2). Old table dropped once verified.

`email_scan_log` gains the missing identifier:

```sql
ALTER TABLE family_chief_of_staff.email_scan_log
  ADD COLUMN connection_id uuid REFERENCES family_chief_of_staff.email_connections(id) ON DELETE CASCADE;
```

(Nullable at first for the existing backfilled rows from the single-mailbox era; new rows always set it.)

`entries.source_detail` (jsonb, already freeform) moves from the Gmail-specific `googleAccountEmail` key to a provider-agnostic shape going forward: `{ provider: 'google' | 'microsoft', accountEmail, connectionId, ... }`. Old rows keep their existing shape (never rewritten) — reader code should check both for a transition period.

**Calendar sync mapping table** (new, backs two-way sync in §6):

```sql
CREATE TABLE family_chief_of_staff.calendar_sync_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          uuid NOT NULL REFERENCES family_chief_of_staff.entries(id) ON DELETE CASCADE,
  connection_id     uuid NOT NULL REFERENCES family_chief_of_staff.email_connections(id) ON DELETE CASCADE,
  external_event_id text NOT NULL,
  external_updated_at timestamptz,
  last_pushed_at    timestamptz,
  last_pulled_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_event_id),
  UNIQUE (entry_id, connection_id)
);
```

One row per (entry, connection) — an entry can in principle sync to more than one calendar (e.g. a family event on both parents' calendars), though the UI in Phase 1/2 only needs to support one link at a time.

## 4. Provider abstraction

New directory: `scripts/pipeline/providers/`, one subfolder per provider (`google/`, `microsoft/`), each implementing two interfaces defined once, provider-agnostic:

```ts
// scripts/pipeline/providers/types.ts
interface EmailProvider {
  listRecentMessageIds(connection: EmailConnection, sinceDays: number): Promise<string[]>;
  fetchMessageDetail(connection: EmailConnection, id: string): Promise<NormalizedEmailMessage>;
  fetchAttachmentBuffer(connection: EmailConnection, messageId: string, attachmentId: string): Promise<Buffer>;
}

interface CalendarProvider {
  listEvents(connection: EmailConnection, range: { from: Date; to: Date }): Promise<NormalizedCalendarEvent[]>;
  createEvent(connection: EmailConnection, event: NormalizedCalendarEvent): Promise<string>; // returns external id
  updateEvent(connection: EmailConnection, externalId: string, event: NormalizedCalendarEvent): Promise<void>;
  deleteEvent(connection: EmailConnection, externalId: string): Promise<void>;
}
```

`NormalizedEmailMessage` / `NormalizedCalendarEvent` are the one shape the rest of the pipeline (extraction, dedupe, entry-writing, calendar sync) works with — Gmail's and Graph's wildly different raw shapes get mapped into these at the provider boundary and never leak further in. `scripts/pipeline/index.ts` and the new calendar-sync equivalent become a dispatcher: for each active connection, pick `providers[connection.provider]` and call the interface method — no per-provider branching outside `providers/`.

Existing Gmail code (`scripts/pipeline/gmail/*`) moves under `scripts/pipeline/providers/google/email.ts`, refactored to take a `connection` (with its own decrypted tokens) instead of reading the singleton row itself.

## 5. OAuth: in-app flow, both providers

Replaces the CLI script entirely (kept only as a documented local-recovery fallback, or deleted — decide at implementation time).

**Routes** (new):
- `/api/connectors/google/start`, `/api/connectors/google/callback`
- `/api/connectors/microsoft/start`, `/api/connectors/microsoft/callback`

**Flow**: user is on their own `/profile` (see §8), clicks "Connect Gmail" or "Connect Microsoft" → `start` route builds the provider's consent URL with `state` = `{ familyMemberId, csrfNonce }` (nonce stored in a short-lived signed cookie to prevent CSRF) and the scopes appropriate to what they're enabling (email only, or email+calendar) → provider redirects back to `callback` → exchange code for tokens → encrypt → upsert `email_connections` row for that `familyMemberId`.

**"Who is connecting" stays the existing no-auth trust model**: the family member is whoever `fcos_active_member` says at the moment they click Connect — same posture as every other write in this app today. Not a new gap, just the existing one extended to a new surface.

**Google**: same GCP project/OAuth client as today, scopes grow from `gmail.readonly` alone to `gmail.readonly` + (Phase 2) `https://www.googleapis.com/auth/calendar.events` (read/write) or `calendar.readonly` if a read-only variant is preferred for members who don't want write access — worth a per-connection toggle rather than all-or-nothing. Already published to production (this session) and already has the `gmail.readonly` restricted scope registered; adding a Calendar scope needs the same Data Access registration step, and Calendar scopes are Google-classified as "sensitive" (not "restricted" like Gmail) — lower verification bar.

**Microsoft**: net-new. Needs an **Azure AD (Entra ID) app registration** — a manual one-time console step, same category as the original GCP OAuth client setup, and something only the account owner can do (flagging now so it's not a surprise at implementation time). Register as a **multi-tenant + personal Microsoft accounts** app (this is the specific audience setting required to cover both work/school M365 accounts *and* personal Hotmail/Outlook.com accounts in one registration — a common gotcha). Use `@azure/msal-node` for the auth code flow and Microsoft Graph (`Mail.Read`, `Calendars.ReadWrite`) for data access. New env vars: `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`.

**Token encryption at rest** (`lib/security/tokenCrypto.ts`, new): AES-256-GCM, key from a new env var `CONNECTOR_TOKEN_ENCRYPTION_KEY` (32-byte, base64, generated once and set in Vercel + `.env.local`, never committed). `encryptToken`/`decryptToken` wrap every read/write of `refresh_token_enc`/`access_token_enc`. This is app-level, not Supabase Vault — simpler, no new infra dependency, appropriate for this app's scale; revisit if the app ever does move toward real multi-tenancy.

**Revoke on delete**: deleting a connection (§7) calls the provider's token-revocation endpoint (Google: `https://oauth2.googleapis.com/revoke`; Microsoft: no direct programmatic revoke — clearing the stored token and instructing the user to remove app access from their Microsoft account if they want a full server-side revoke, a known Microsoft Graph limitation) before deleting the row, not just deleting the row.

## 6. Calendar two-way sync

**Pull**: a new scheduled job (own cron tick, own route — see §7) lists events in a rolling window (e.g. −7d to +90d) from every active connection with `calendar_enabled`, maps each into a `NormalizedCalendarEvent`, and either creates a new `entries` row (`source_type: 'calendar_sync'`) + a `calendar_sync_links` row, or — if a `calendar_sync_links` row already matches that `external_event_id` — updates the existing linked entry if the external `updated` timestamp is newer than `last_pulled_at`.

**Push**: an entry only pushes to an external calendar if it's **explicitly linked** — either because it originated from a pull, or because the user opts in via a "Sync to my calendar" picker on `EntryForm` (same interaction pattern as the existing "About" linker / Activity picker — pick a connection from the subject member's calendar-enabled connections). Pushing is *not* automatic for every entry in the household; an unlinked entry never leaves the app. On create/update of a linked entry, call `createEvent`/`updateEvent` on the linked connection; on delete, call `deleteEvent` then remove the `calendar_sync_links` row.

**Conflict rule** (default, statable and overridable later): **last-write-wins by timestamp** — compare the entry's `updated_at` against the external event's `updated` field at sync time; whichever is newer wins and overwrites the other side. This is a pragmatic default for a personal household tool, not a CRDT-grade merge — worth a follow-up "conflict needs review" surfacing (mirroring the existing `pending_review` pattern) if last-write-wins produces a visibly bad outcome in practice, but not built preemptively.

**Deletion asymmetry**: if the household deletes a linked entry, the push deletes the external event too. If the external event is deleted on the provider's side, the next pull removes the `calendar_sync_links` row and leaves the `entries` row in place (no silent deletion of in-app data from an external signal) — flags it back to `pending_review` style handling is a reasonable future refinement, not required for v1.

## 7. Pause / Delete / cron rework

**Pause**: `status = 'paused'`. Both the email pipeline and calendar sync skip paused connections entirely — no fetch, no calls to the provider. Tokens and all previously-imported data (entries, `calendar_sync_links`) stay untouched. Resuming just flips status back to `'active'`.

**Delete**: revoke (§5), then hard-delete the `email_connections` row. `email_scan_log.connection_id` and `calendar_sync_links.connection_id` both cascade-delete (audit trail for a dead connection isn't useful to keep, unlike the entries it already created — those stay, matching the existing "Forget" precedent elsewhere in this app where profile data is removable but calendar/task history isn't). Requires a full reconnect (new OAuth grant) to bring the same account back — no soft-restore.

**"Needs reconnect"**: when a refresh fails (the `invalid_grant` class of error just diagnosed and fixed this session), the pipeline/sync catches it, sets `status = 'needs_reconnect'` and `last_error`, and stops retrying that connection until the member re-authenticates — surfaced as a status badge on `/profile` (§8) instead of silently failing cron runs that only get noticed by manually reading GitHub Actions logs, as happened this session.

**Cron/runtime**: `app/api/pipeline/gmail-scan/route.ts` (renamed `email-scan`) becomes provider-agnostic — loops every `active` connection with `email_enabled`, dispatches to `providers[connection.provider]`. Raise `maxDuration` from 60 to Vercel's current 300s default headroom, and move the message cap from a single global `MAX_MESSAGES_PER_RUN` to **per-connection** (e.g. 8 per connection per run) so N mailboxes don't starve each other under one shared budget — if real-world connection counts ever threaten the 300s ceiling, that's the trigger to revisit a queue, not before. Calendar sync gets its own route/cron tick (`/api/pipeline/calendar-sync`) rather than being folded into the email scan, since pull+push work is a different shape and shouldn't share a failure domain with mail scanning.

## 8. UI: connectors on Profile

**Primary surface: each member's own `/profile`.** New "Connected accounts" section — a member sees and manages only their own connections (matches "each person connects their own account," the model the current mock already gestures at). Per connection: provider icon, account email, status pill (Connected / Paused / Needs reconnect), a scope indicator (Email only / Email + Calendar), and Pause/Resume + Delete actions. Delete reuses the existing confirm-step pattern already established for `ForgetDialog` (warning → explicit confirm button, no type-to-confirm box) rather than inventing new confirmation UI. "Add a connector" opens a provider picker (Gmail / Microsoft) and a scope picker (Email / Email + Calendar) before kicking off the OAuth redirect.

**Secondary surface: `/settings/accounts` becomes a read-only HoH oversight dashboard**, not the primary management surface — every member's connections, status, and last-synced time in one place for troubleshooting, with no controls of its own (each action still happens on the owning member's own profile). This keeps the useful "see the whole household's connector health at a glance" value the mock already implies, without it being where per-member self-service actually happens.

## 9. Phasing

**Phase 0 — Foundational rebuild (no user-visible feature yet)**
`email_connections` + `calendar_sync_links` migrations, backfill the existing single Gmail row, token encryption module, `EmailProvider`/`CalendarProvider` interfaces + `NormalizedEmailMessage`/`NormalizedCalendarEvent` types, move existing Gmail code under `providers/google/`, rework `index.ts` into a connection-looping dispatcher (still Google-only in practice), add `connection_id` to `email_scan_log`. Existing single-mailbox behavior should be unchanged end-to-end after this phase — a refactor, not a feature.

**Phase 1 — Google email, real per-member connect**
In-app OAuth routes for Google, Server Actions (`pauseConnection`, `resumeConnection`, `deleteConnection`, `createConnectionFromCallback`), `/profile` "Connected accounts" UI, `/settings/accounts` converted to the read-only oversight view, retire the CLI script. "Needs reconnect" surfacing wired to real refresh failures.

**Phase 2 — Google Calendar, two-way**
`calendar.events` scope added to the same Google connection (opt-in per connection), `CalendarProvider` Google implementation, pull+push+conflict-rule per §6, new calendar-sync cron route, `EntryForm`'s "Sync to my calendar" linker.

**Phase 3 — Microsoft email**
Azure AD app registration (manual, user-owned step), MSAL-node + Graph `Mail.Read`, `MicrosoftEmailProvider` implementing the same interface, message normalization into `NormalizedEmailMessage`, wired into the same `/profile` UI and dispatcher — additive, not a parallel system.

**Phase 4 — Microsoft Calendar, two-way**
Graph `Calendars.ReadWrite`, `MicrosoftCalendarProvider`, same sync/conflict machinery from Phase 2 reused as-is.

**Phase 5 — Cross-cutting hardening**
Test coverage for the provider-wiring layer (currently zero, per §1) using mocked provider clients; rate-limit/backoff handling per provider; validate the per-connection cron budget under real multi-connection load; revisit whether the 300s/per-connection-cap model is holding once there's real usage across providers.

## 10. Explicitly out of scope for this plan

- Real multi-household tenancy (separate `households` table, per-household RLS, real login) — a distinct future initiative; this plan avoids blocking it but doesn't build it.
- Real end-user authentication generally (still the `fcos_active_member` cookie trust model) — same deferred workstream noted throughout CLAUDE.md.
- Other providers beyond Google and Microsoft (Yahoo, iCloud, etc.) — not requested, and the `EmailProvider`/`CalendarProvider` abstraction from Phase 0 is exactly what would make adding one later tractable.
- CalDAV/generic calendar protocols — Google and Microsoft's own APIs cover the stated requirement.
