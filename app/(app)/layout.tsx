import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { TabPillRow } from "@/components/layout/TabPillRow";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatShell } from "@/components/chat/ChatShell";
import { getCurrentMember } from "@/lib/currentMember";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getPendingReviewEvents } from "@/lib/data/events";
import { getPendingReviewTodos } from "@/lib/data/todos";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";

// This layout fetches from Supabase on every render, so nothing under it can be
// prerendered at build time — the build env has no Supabase creds. Setting it
// here (rather than per-page) also covers Next's own /_not-found route, which
// still renders this layout.
export const dynamic = "force-dynamic";

/**
 * The main app's chrome (header, tab row, chat bar) — moved out of the true
 * root layout (app/layout.tsx) as of the Identity/Sign-In/Onboarding pass
 * (2026-09-12) so /signin, /signup, and onboarding routes can render
 * standalone. As of the real-auth pass, this is also the app's one real
 * security gate: no Supabase session → /signin, same redirect
 * resolvePostSignInDestination() already uses. The old fcos_active_member
 * device cookie / LockScreen / MemberPicker are retired — every screen
 * requires a real signed-in identity now.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentMember = await getCurrentMember();
  if (!currentMember) redirect("/signin");
  const householdId = currentMember.householdId;

  const [familyMembers, pendingReviewEvents, pendingReviewTodos, arrivalRules] = await Promise.all([
    getFamilyMembers(householdId),
    getPendingReviewEvents(householdId),
    getPendingReviewTodos(householdId),
    getArrivalBufferRules(householdId),
  ]);
  const pendingReviewCount = pendingReviewEvents.length + pendingReviewTodos.length;

  return (
    <div className="relative pb-[140px]">
      <ChatProvider>
        <header className="pt-8 pb-4 px-6 flex flex-col gap-5">
          <AppHeader pendingReviewCount={pendingReviewCount} activeMember={currentMember} />
          <TabPillRow />
        </header>
        <main className="px-6 py-2 flex flex-col gap-6">{children}</main>
        <ChatShell familyMembers={familyMembers} arrivalRules={arrivalRules} />
      </ChatProvider>
    </div>
  );
}
