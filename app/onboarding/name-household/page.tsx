import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { getHousehold } from "@/lib/data/onboarding";
import { NameHouseholdForm } from "@/components/onboarding/NameHouseholdForm";

export const dynamic = "force-dynamic";

export default async function NameHouseholdPage() {
  const user = await getAuthUser();
  if (!user) redirect("/signin");

  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) redirect("/onboarding/profile");

  const household = await getHousehold(self.householdId);
  // Already named (e.g. reached via browser back after naming it) — this
  // screen has nothing to do, move on.
  if (household?.name) redirect("/onboarding/household");

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-6 py-5">
      <NameHouseholdForm householdId={self.householdId} />
    </div>
  );
}
