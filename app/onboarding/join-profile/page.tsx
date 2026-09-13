import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getFamilyMemberByAuthUserId } from "@/lib/data/familyMembers";
import { NewAdultProfileForm } from "@/components/onboarding/NewAdultProfileForm";

export const dynamic = "force-dynamic";

export default async function JoinProfilePage() {
  const user = await getAuthUser();
  if (!user) redirect("/signin");

  const existing = await getFamilyMemberByAuthUserId(user.id);
  if (existing) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
      <NewAdultProfileForm />
    </div>
  );
}
