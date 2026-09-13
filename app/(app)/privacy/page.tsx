import { ASSISTANT_NAME } from "@/lib/config";

// The root layout fetches from Supabase on every render, so no route can be
// prerendered at build time (the build env has no Supabase creds).
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink mb-6">
        Privacy Policy
      </h1>
      <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col gap-4 text-[14px] text-muted-text leading-relaxed">
        <p>
          {ASSISTANT_NAME} is a private, single-household application built and
          used by one family. It is not a public product, does not have
          accounts you can sign up for, and does not sell or share data with
          any third party for advertising or marketing purposes.
        </p>
        <div>
          <h2 className="font-semibold text-ink text-[15px] mb-1">What data this app accesses</h2>
          <p>
            With the household&rsquo;s own explicit Google sign-in, the app
            requests read-only (<code>gmail.readonly</code>) access to one
            household Gmail inbox, solely to find schedule-relevant content
            (school and activity emails) and turn it into calendar events and
            to-dos for that household to review and confirm.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink text-[15px] mb-1">How that data is used</h2>
          <p>
            Email content is processed by the Anthropic Claude API to extract
            events, reminders, tasks, and household advisories. Extracted
            items, along with a short quoted snippet and sender/subject for
            reference, are stored in a private database used only by this
            household&rsquo;s own instance of the app. Email content is never
            used for advertising, never sold, and never shared with any other
            household or third party.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink text-[15px] mb-1">Data retention and deletion</h2>
          <p>
            The household can edit or delete any calendar/to-do item created
            this way at any time from within the app. To request deletion of
            all data associated with this app, contact the address below.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink text-[15px] mb-1">Contact</h2>
          <p>Questions about this policy: rallen7425@gmail.com</p>
        </div>
      </section>
    </div>
  );
}
