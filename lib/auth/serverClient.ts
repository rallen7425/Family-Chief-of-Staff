import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase Auth client for Server Components, Server Actions,
 * and Route Handlers — reads/writes the session via Next.js's cookie store,
 * per @supabase/ssr's standard Next.js App Router pattern.
 *
 * Same scope boundary as lib/auth/browserClient.ts: auth only, never
 * family_chief_of_staff data (that stays on lib/supabase.ts's service-role
 * client). See that file's comment for the shared-package-boundary reasoning.
 *
 * A Server Component can read cookies but not write them — `setAll` there
 * will throw if middleware.ts isn't refreshing the session on every request,
 * which is why that middleware exists (see middleware.ts at the repo root).
 */
export async function createAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, where cookies can't be set —
          // safe to ignore as long as middleware.ts is refreshing sessions.
        }
      },
    },
  });
}
