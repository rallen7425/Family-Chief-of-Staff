import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/auth/serverClient";
import { resolvePostSignInDestination } from "@/lib/actions/auth";

/** Where Supabase Auth sends the browser back after Google OAuth completes
 * (see lib/actions/auth.ts's signInWithGoogleAction, and the redirect URL
 * this exact path needs adding to the Supabase project's Auth allow-list). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(await resolvePostSignInDestination(), url.origin));
    }
  }

  return NextResponse.redirect(new URL("/signin?error=oauth_failed", url.origin));
}
