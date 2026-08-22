import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/**
 * Server-only, service-role client scoped to the `rufus` schema. No auth in
 * this app (single household, single implicit user), so there's no browser
 * client, no anon key, and no session/cookie handling — every read and
 * write goes through this one client from server code (Server Components,
 * Server Actions, route handlers, pipeline scripts).
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    db: { schema: "rufus" },
    // Node 20 has no native WebSocket; @supabase/supabase-js needs one even
    // though this app doesn't use Realtime. Node 22+ can drop this.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}
