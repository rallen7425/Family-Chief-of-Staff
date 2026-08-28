import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/**
 * `@supabase/supabase-js` constructs a RealtimeClient inside `createClient()`
 * even though this app never uses Realtime, and that construction throws on
 * Node < 22 ("native WebSocket not found"). Supply the `ws` polyfill only when
 * there's no global WebSocket; on Node 22+ (see `engines` in package.json) the
 * native one is used and `ws` isn't touched at runtime.
 *
 * TODO: once every machine here runs Node >= 22, delete this branch, the
 * `import WebSocket from "ws"` above, and the `ws` / `@types/ws` deps.
 */
const realtimeOptions =
  typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined"
    ? { transport: WebSocket as unknown as typeof globalThis.WebSocket }
    : undefined;

/**
 * Server-only, service-role client scoped to the `family_chief_of_staff`
 * schema. No auth in this app (single household, single implicit user), so
 * there's no browser client, no anon key, and no session/cookie handling —
 * every read and write goes through this one client from server code
 * (Server Components, Server Actions, route handlers, pipeline scripts).
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    db: { schema: "family_chief_of_staff" },
    ...(realtimeOptions ? { realtime: realtimeOptions } : {}),
  });
}
