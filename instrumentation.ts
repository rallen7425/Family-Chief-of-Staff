/**
 * Runs once when the server starts, before any request is handled. Sets the
 * Node process timezone explicitly rather than relying on ambient server
 * config — Vercel defaults to UTC, and `TZ` is a reserved env var name
 * there (can't be set via the normal dashboard/CLI), so this is the
 * reliable way to get it applied in every environment (local dev,
 * preview, production) without depending on infra config that could
 * silently drift or be missing on a fresh deploy.
 *
 * Every `new Date()` / date-fns `format()` call in this app that isn't
 * explicitly timezone-aware relies on this being set correctly — without
 * it, server-rendered times are off by several hours from the household's
 * actual local time (data is stored correctly in UTC; only display and
 * "what day is today" calculations are affected). See CLAUDE.md.
 */
export async function register() {
  process.env.TZ = "America/New_York";
}
