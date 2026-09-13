import Link from "next/link";
import { Compass } from "lucide-react";

/**
 * The true root not-found — Next.js only falls back to this for a path
 * that matches no route at all (not even a route group), so it can't
 * assume the app chrome or an authenticated session exist. Kept minimal,
 * matching /signin's standalone treatment. app/(app)/not-found.tsx is the
 * separate, chrome-wrapped one used when a route *inside* the app calls
 * notFound() (e.g. a bad /family/[memberId]) — moving that one here too
 * would lose the app chrome for that case, which is why both exist.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass size={24} strokeWidth={2} />
      </div>
      <h1 className="font-display text-[20px] font-semibold text-ink">Page not found</h1>
      <p className="text-[14px] leading-relaxed text-muted-text">
        The page you were looking for isn&rsquo;t here.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-pill bg-primary px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Back to Today
      </Link>
    </div>
  );
}
