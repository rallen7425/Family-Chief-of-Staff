# Implementation prompt for Claude Code — Email + Calendar Connectors (Phase 0 + Phase 1)

Paste everything below into Claude Code in the `family-chief-of-staff` repo. Self-contained and independent of the other prompt files in this repo root — none of them depend on each other.

**Read `email-calendar-connectors-plan.md` first.** It has the full decision record (why full two-way calendar sync, why token encryption now, why this stays single-household, the complete target schema, the provider-interface design) — this prompt distills it into concrete file-level work for the two phases that are actually ready to build now. Don't re-derive rationale that's already settled there.

## Scope of this prompt: Phase 0 + Phase 1 only

The full plan is 5 phases (§9 of the plan doc). This prompt covers:
- **Phase 0** — foundational schema/abstraction rebuild. Should be **behavior-neutral**: the existing single Gmail mailbox keeps working exactly as it does today, end to end, after this phase — it's a refactor, not a feature.
- **Phase 1** — real in-app Google OAuth, per-member connect/pause/delete, `/profile` UI, retiring the CLI script.

**Do not build Phase 2 (Calendar sync), Phase 3 (Microsoft email), or Phase 4 (Microsoft Calendar) in this pass** — those get their own prompts once this lands and gets used for a bit. The schema and provider-interface work in Phase 0 should make them additive later, not require this Phase 0 work to be redone.

---

## 1. Data model changes (Phase 0)

Apply as a new migration in the sibling `rocky-coast-labs` repo (this project's convention — check recent migration filenames there for the naming pattern, e.g. `YYYYMMDDHHMMSS_family_chief_of_staff_<description>.sql`), against the `family_chief_of_staff` schema, same RLS/grants posture as every existing table (RLS enabled, zero anon/authenticated policies, service-role-only grants — copy the exact GRANT statements from the most recent migration there rather than reinventing the incantation).

Use the exact schema from `email-calendar-connectors-plan.md` §3: `email_connections` (replacing `gmail_credentials`) and `calendar_sync_links` (create now even though nothing writes to it until Phase 2 — this keeps the FK/cascade shape settled early). Also add `email_scan_log.connection_id` per that section.

**Backfill**: the migration (or a one-off follow-up script, your call) needs to move the existing single `gmail_credentials` row into one real `email_connections` row. Concretely:
- `provider = 'google'`
- `family_member_id` = whichever adult the household currently attributes the connection to today (`app/settings/accounts/page.tsx`'s existing `ownerId` logic — HoH-email-match, else first HoH, else first adult — run that same resolution once to pick the value, don't hardcode a name)
- `external_account_email` = the existing `google_account_email`
- `email_enabled = true`, `calendar_enabled = false`
- `refresh_token_enc` = the existing plaintext `refresh_token`, encrypted (see §3 below) — this migration step needs to run application-side (a Node script using the new `lib/security/tokenCrypto.ts`), not as raw SQL, since the encryption key lives in an env var, not the database.
- Verify the backfilled row works (a real pipeline run against it) before dropping `gmail_credentials`. Don't drop the old table in the same migration that creates the new one — do it as a separate follow-up migration once verified live, matching how this repo has handled every other "verify before dropping the old table" migration so far (see CLAUDE.md's 2026-08-28 session for the `events`/`todos` → `entries` precedent).

Update `lib/data/dbTypes.ts` to add the new row types, and delete the `gmail_credentials`-specific type once the old table is dropped.

---

## 2. Provider abstraction (Phase 0)

Create `scripts/pipeline/providers/types.ts` with the `EmailProvider` interface and `NormalizedEmailMessage` type from the plan doc §4 (skip `CalendarProvider`/`NormalizedCalendarEvent` for now — add those in the Phase 2 prompt, don't build unused interface surface now).

Move existing Gmail code:
- `scripts/pipeline/gmail/client.ts` → `scripts/pipeline/providers/google/client.ts`, refactored so `getGmailClient()` takes an `EmailConnection` (decrypted tokens already resolved by the caller — this file shouldn't know about encryption) instead of querying `.eq("id", 1)` itself.
- `scripts/pipeline/gmail/fetchMessages.ts`, `fetchAttachments.ts` → `scripts/pipeline/providers/google/email.ts`, refactored to implement `EmailProvider`, wrapping the existing Gmail-specific logic (which stays functionally identical — this is a reshuffle + interface-conformance pass, not a rewrite of the Gmail-specific parts) and mapping raw Gmail message shapes into `NormalizedEmailMessage` at the boundary.

`scripts/pipeline/index.ts` becomes a connection-looping dispatcher:
```ts
const connections = await getActiveEmailConnections(); // new query: status='active' AND email_enabled=true
for (const connection of connections) {
  const provider = providers[connection.provider]; // { google: googleEmailProvider } for now
  await processConnection(connection, provider, ...);
}
```
Move the per-run message cap (`MAX_MESSAGES_PER_RUN`) to be **per-connection** rather than global (plan doc §7) — with exactly one connection today this is behaviorally identical, but get the shape right now rather than retrofitting it when a second connection shows up.

`scripts/pipeline/write.ts`'s `resolvePerson`/`resolveByDomain` need **no changes** — they're already provider-agnostic per the plan doc §1. Do change how `source_detail` is written (plan doc §3's provider-agnostic shape: `{ provider, accountEmail, connectionId, ... }` instead of the current `googleAccountEmail` key) — but leave existing rows alone, don't backfill old `entries.source_detail` shapes.

`app/api/pipeline/gmail-scan/route.ts` → rename to `app/api/pipeline/email-scan/route.ts` (update `.github/workflows/gmail-scan.yml`'s URL and the Vercel env references accordingly). Bump `maxDuration` from 60 to 280 (leave headroom under Vercel's 300s platform default rather than maxing it out).

---

## 3. Token encryption (Phase 0)

New `lib/security/tokenCrypto.ts`: AES-256-GCM, `encryptToken(plaintext: string): Buffer` / `decryptToken(ciphertext: Buffer): string`. Key from `process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY` — throw a clear startup-time error if it's missing rather than silently failing on first use. Generate a real key for `.env.local` and Vercel (`openssl rand -base64 32` or equivalent) — **do not** commit a placeholder/example key anywhere, and don't reuse `CRON_SECRET` or any other existing secret for this.

Every read/write of `refresh_token_enc`/`access_token_enc` on `email_connections` goes through this module — no raw token ever touches a `console.log`, error message, or `source_detail` jsonb blob.

---

## 4. In-app Google OAuth (Phase 1)

New routes:
- `app/api/connectors/google/start/route.ts` — reads `familyMemberId` from a query param (the `/profile` UI passes the active member's own id — don't trust a client-supplied id for anyone *other* than the currently active member; check it server-side against `fcos_active_member` before proceeding, same trust boundary as every other write in this app), builds the Google consent URL (reuse the existing `GMAIL_OAUTH_CLIENT_ID`/`GMAIL_OAUTH_CLIENT_SECRET`, but the redirect URI now points at the deployed app's callback route, not `localhost:3457` — this is a real behavioral change from the CLI script), sets a short-lived signed cookie with a CSRF nonce, embeds `{ familyMemberId, csrfNonce }` in the OAuth `state` param, redirects.
- `app/api/connectors/google/callback/route.ts` — validates `state`'s nonce against the cookie, exchanges the code for tokens, encrypts them (§3), upserts an `email_connections` row (`ON CONFLICT (provider, external_account_email)` — handle the case where this Google account is already connected to a *different* family member by surfacing a clear error rather than silently reassigning ownership), redirects back to `/profile` with a success/error query param the page reads once to show a toast/banner.

New Server Actions (`lib/actions/emailConnections.ts`):
- `pauseConnection(id)` / `resumeConnection(id)` — flip `status`, must belong to the currently active member (check server-side, don't trust a client-supplied id for someone else's connection).
- `deleteConnection(id)` — call Google's revoke endpoint (`https://oauth2.googleapis.com/revoke?token=...`, using the decrypted refresh token) best-effort (log and continue if the revoke call itself fails — don't block deletion on Google's endpoint being reachable), then hard-delete the row.

Retire `scripts/gmail/get-refresh-token.ts` — either delete it, or leave it with a comment noting it's superseded by the in-app flow and kept only as a local-recovery fallback if the in-app flow is ever broken. Your call; don't leave it as the primary documented way to connect an account anywhere (README, CLAUDE.md, etc.) once the in-app flow exists.

---

## 5. `/profile` UI (Phase 1)

New "Connected accounts" section on `app/profile/page.tsx` / `MyProfileClient.tsx` (mirrors the existing per-member profile pattern from the Profile & Family rework) — **only shows the active member's own connections**, not anyone else's. Per connection: provider icon + `external_account_email`, status pill (`Connected` / `Paused` / `Needs reconnect`), scope label (`Email` for now — `Email + Calendar` becomes real in Phase 2), Pause/Resume toggle, Delete (reuse `ForgetDialog`'s warning→confirm pattern, not a new confirmation component). "Add a connector" button starts the Google OAuth flow (only Google is offered in this phase — don't build a provider picker UI yet if Microsoft isn't wired up; a single "Connect Gmail" button is fine, becomes a picker in Phase 3).

Convert `app/settings/accounts/page.tsx` into the read-only HoH oversight dashboard per plan doc §8 — every member's connection(s), status, `last_synced_at`, with **no interactive controls** (no Pause/Delete here — those only exist on the owning member's own `/profile`). Delete `lib/data/gmailCredentials.ts`'s `getConnectedGmailAccount()` (singleton-shaped) and replace with a proper `getEmailConnectionsByMember()` / `getAllEmailConnections()` in a new `lib/data/emailConnections.ts`.

---

## 6. Explicitly out of scope for this pass

- Calendar sync of any kind (Phase 2) — `calendar_enabled` stays `false` on every connection created in this phase; don't build the "Sync to my calendar" `EntryForm` linker yet.
- Microsoft/Outlook/Hotmail (Phase 3/4) — no Azure app registration, no MSAL, no Graph calls. The `EmailProvider` interface should make this additive later, but don't build a second implementation speculatively now.
- Real multi-household tenancy — per plan doc §10, out of scope entirely; nothing here should require it.
- Rate limiting/backoff, broader test coverage of the provider layer (Phase 5) — fine to add basic tests alongside this work if convenient, but a full hardening pass is its own later prompt.

---

## 7. Acceptance / testing notes

- After Phase 0, before touching any OAuth/UI code: run the existing pipeline end-to-end against the real inbox exactly as before (one connection, real cron/route call) and confirm it behaves identically to pre-refactor — same dedupe behavior, same event/todo creation, `tsc`/`eslint`/existing test suite all green. This is the checkpoint that proves Phase 0 was truly behavior-neutral before Phase 1 UI work starts on top of it.
- Connecting a *second* Google account (e.g. a throwaway test Gmail address, or the same account under a different `family_member_id` to test the conflict path) actually creates a second `email_connections` row and the pipeline processes both on the next run — this is the one thing that was structurally impossible before this work and is the actual point of Phase 0.
- Pausing a connection: confirm the next pipeline run's logs/response show it skipped, and that no new `email_scan_log` rows get created for that connection while paused.
- Deleting a connection: confirm the Google account shows as no longer having granted access (check via https://myaccount.google.com/permissions on the test account) — not just that the row disappeared from the DB.
- Simulate a `needs_reconnect` transition (e.g. temporarily corrupt a test connection's stored refresh token) and confirm the pipeline sets the status/last_error instead of throwing an unhandled error, and that `/profile` surfaces it.
- Confirm no raw token value ever appears in a server log, error message, or API response during any of the above — grep your own test-run logs for the plaintext token value you connected with, not just trust that the encryption code path was called.
