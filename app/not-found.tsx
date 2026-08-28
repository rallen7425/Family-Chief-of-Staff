import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink mb-6">
        Page not found
      </h1>
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Compass size={24} strokeWidth={2} />
        </div>
        <h2 className="font-semibold text-[17px] text-ink">
          That link doesn&rsquo;t go anywhere
        </h2>
        <p className="text-[14px] text-muted-text leading-relaxed">
          The page you were looking for isn&rsquo;t here.
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2.5 rounded-pill bg-primary text-white font-semibold text-[14px] hover:bg-primary-hover transition-colors"
        >
          Back to Today
        </Link>
      </section>
    </div>
  );
}
