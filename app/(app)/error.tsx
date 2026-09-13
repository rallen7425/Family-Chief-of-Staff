"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console and (with a digest) in Vercel logs.
    console.error(error);
  }, [error]);

  return (
    <div>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink mb-6">
        Something went wrong
      </h1>
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-accent-coral/10 text-accent-coral flex items-center justify-center">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h2 className="font-semibold text-[17px] text-ink">This page didn&rsquo;t load</h2>
        <p className="text-[14px] text-muted-text leading-relaxed">
          A temporary problem stopped this page from loading. Trying again usually fixes it.
        </p>
        {error.digest && (
          <p className="text-[12px] text-muted-label">Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 px-4 py-2.5 rounded-pill bg-primary text-white font-semibold text-[14px] hover:bg-primary-hover transition-colors"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
