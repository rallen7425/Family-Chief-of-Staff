import { AppHeader } from "@/components/layout/AppHeader";
import { LockScreen } from "@/components/auth/LockScreen";
import { TabPillRow } from "@/components/layout/TabPillRow";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatShell } from "@/components/chat/ChatShell";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getPendingReviewEvents } from "@/lib/data/events";
import { getPendingReviewTodos } from "@/lib/data/todos";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";

// This layout fetches from Supabase on every render, so nothing under it can be
// prerendered at build time — the build env has no Supabase creds. Setting it
// here (rather than per-page) also covers Next's own /_not-found route, which
// still renders this layout.
export const dynamic = "force-dynamic";

/**
 * The main app's chrome (header, tab row, chat bar) and LockScreen gating —
 * moved out of the true root layout (app/layout.tsx) as of the
 * Identity/Sign-In/Onboarding pass (2026-09-12) so /signin, /signup, and
 * future onboarding routes can render standalone instead of inheriting
 * navigation to app screens and a chat bar before anyone's authenticated.
 * Logic here is otherwise unchanged from the old root layout — LockScreen's
 * relationship to real auth sessions is still an open decision,
 * deliberately untouched by this move.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [familyMembers, pendingReviewEvents, pendingReviewTodos, arrivalRules] = await Promise.all([
    getFamilyMembers(),
    getPendingReviewEvents(),
    getPendingReviewTodos(),
    getArrivalBufferRules(),
  ]);
  const pendingReviewCount = pendingReviewEvents.length + pendingReviewTodos.length;
  const activeMember = await getActiveMember(familyMembers);
  // Explicitly logged out (not just an empty roster) → show the lock screen
  // in place of the whole app until someone picks a profile.
  const locked = activeMember === null && familyMembers.length > 0;

  return (
    <div className="relative pb-[140px]">
      {locked ? (
        <LockScreen members={familyMembers} />
      ) : (
        <ChatProvider>
          <header className="pt-8 pb-4 px-6 flex flex-col gap-5">
            <AppHeader pendingReviewCount={pendingReviewCount} activeMember={activeMember} />
            <TabPillRow />
          </header>
          <main className="px-6 py-2 flex flex-col gap-6">{children}</main>
          <ChatShell familyMembers={familyMembers} arrivalRules={arrivalRules} />
        </ChatProvider>
      )}
    </div>
  );
}
