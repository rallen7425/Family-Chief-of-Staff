import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { getHousehold, getHouseholdMembers } from "@/lib/data/onboarding";
import { HouseholdRoster } from "@/components/onboarding/HouseholdRoster";

export const dynamic = "force-dynamic";

export default async function OnboardingHouseholdPage() {
  const user = await getAuthUser();
  if (!user) redirect("/signin");

  const self = await getFamilyMemberByAuthUserId(user.id);
  if (!self) redirect("/onboarding/profile");

  const [household, allMembers] = await Promise.all([
    getHousehold(self.householdId),
    getHouseholdMembers(self.householdId),
  ]);
  const others = allMembers.filter((m) => m.id !== self.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-6 py-5">
      <HouseholdRoster householdName={household?.name ?? null} self={self} members={others} />
    </div>
  );
}
