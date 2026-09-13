"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/auth/browserClient";
import { completeEmailInvite } from "@/lib/actions/invites";

/**
 * Lands here after clicking an emailed invite link. This project's
 * Supabase Auth uses the implicit hash-fragment flow (confirmed
 * empirically, see lib/actions/invites.ts's top comment) — the session
 * only exists in the URL fragment, which no server-side code can read.
 *
 * `@supabase/ssr`'s `createBrowserClient` hardcodes `flowType: "pkce"`
 * (not overridable via options — see node_modules/@supabase/ssr/dist/
 * module/createBrowserClient.js), so its automatic `detectSessionInUrl`
 * throws `AuthPKCEGrantCodeExchangeError` on an implicit hash-fragment
 * URL instead of consuming it — confirmed live during Phase 5 E2E
 * testing (the redirect silently "succeeded" only because a stale
 * session from an earlier sign-in was still in cookies; with a clean
 * session it correctly failed instead). Fixed by parsing the tokens out
 * of the hash ourselves and calling `setSession` directly, which sets
 * the session from the given tokens regardless of flow type.
 */
export function JoinAcceptClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      if (!access_token || !refresh_token) {
        if (!cancelled) setError("This invite link looks invalid or has already been used.");
        return;
      }

      const supabase = createAuthBrowserClient();
      const { data } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;
      if (!data.session) {
        setError("This invite link looks invalid or has already been used.");
        return;
      }
      window.history.replaceState(window.history.state, "", window.location.pathname);
      const result = await completeEmailInvite();
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-[20px] font-bold text-ink">Couldn&rsquo;t complete your invite</p>
        <p className="text-[13px] text-muted-label">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-[14px] text-muted-text">Finishing up…</p>
    </div>
  );
}
