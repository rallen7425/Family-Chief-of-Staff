import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { getHouseholdMembers, getApprovalAuthorityHolderId } from "@/lib/data/onboarding";
import { PermissionsForm } from "@/components/onboarding/PermissionsForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPermissionsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/signin");

  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) redirect("/onboarding/profile");

  const [members, holderId] = await Promise.all([
    getHouseholdMembers(self.householdId),
    getApprovalAuthorityHolderId(self.householdId),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-6 py-5">
      <PermissionsForm members={members} currentHolderId={holderId} selfId={self.id} />
    </div>
  );
}
