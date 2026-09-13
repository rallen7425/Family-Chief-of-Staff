import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * New as of the Identity/Sign-In/Onboarding pass (2026-09-12) — this app has
 * never had a proxy/middleware file before. Session-refresh only for now:
 * keeps a signed-in user's Supabase Auth cookie current on every request, per
 * @supabase/ssr's standard Next.js pattern. Deliberately does NOT redirect or
 * gate any route yet — real route protection (and how it interacts with
 * LockScreen / `fcos_active_member`) is later-phase work, decided together
 * before it's built, not implied by this file existing.
 *
 * Named `proxy` per this Next.js version's file convention — `middleware` is
 * deprecated (see node_modules/next/dist/docs/.../proxy.md); this file was
 * named middleware.ts and the function `middleware` until caught by the
 * build's own deprecation warning.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session token if it's expired — required for
  // Server Components (which can't write cookies themselves) to see a
  // current session.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization,
     * so the session cookie stays fresh on every real page/route hit.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
