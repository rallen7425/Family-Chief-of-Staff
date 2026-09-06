import { MessageCircle } from "lucide-react";
import { ASSISTANT_NAME } from "@/lib/config";

// The root layout fetches from Supabase on every render, so no route can be
// prerendered at build time (the build env has no Supabase creds). Every other
// page sets this; /message was the lone static one and broke the build.
export const dynamic = "force-dynamic";

export default function MessagePage() {
  return (
    <div>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink mb-6">
        Message
      </h1>
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <MessageCircle size={24} strokeWidth={2} />
        </div>
        <h2 className="font-semibold text-[17px] text-ink">Coming soon</h2>
        <p className="text-[14px] text-muted-text leading-relaxed">
          Sending messages to other family members will live here. This is separate
          from the &ldquo;Chat with {ASSISTANT_NAME}&rdquo; bar below, which is your AI assistant.
        </p>
      </section>
    </div>
  );
}
