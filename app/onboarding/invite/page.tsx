import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { OnboardingInviteForm } from "@/components/onboarding/OnboardingInviteForm";

export const dynamic = "force-dynamic";

export default async function OnboardingInvitePage() {
  const user = await getAuthUser();
  if (!user) redirect("/signin");

  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) redirect("/onboarding/profile");

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-6 py-5">
      <OnboardingInviteForm />
    </div>
  );
}
