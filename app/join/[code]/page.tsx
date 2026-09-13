import { getSupabaseClient } from "@/lib/supabase";
import { getHousehold, getFamilyMemberById } from "@/lib/data/onboarding";
import { JoinForm } from "@/components/join/JoinForm";

export const dynamic = "force-dynamic";

function InvalidState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-display text-[20px] font-bold text-ink">{message}</p>
      <p className="text-[13px] text-muted-label">Ask whoever invited you to send a new one.</p>
    </div>
  );
}

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const supabase = getSupabaseClient();
  const { data: invite } = await supabase
    .from("household_invites")
    .select("*")
    .eq("join_code", normalizedCode)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) return <InvalidState message="That code isn't valid." />;
  if (new Date(invite.expires_at) < new Date()) return <InvalidState message="That code has expired." />;
  if (!invite.family_member_id) return <InvalidState message="That code isn't set up correctly." />;

  const [household, member] = await Promise.all([
    getHousehold(invite.household_id),
    getFamilyMemberById(invite.family_member_id),
  ]);
  if (!member) return <InvalidState message="That code isn't set up correctly." />;

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
      <JoinForm
        code={normalizedCode}
        householdName={household?.name ?? "Your household"}
        memberName={member.name}
        memberBirthday={member.birthday ?? null}
        memberAccentColor={member.accentColor}
      />
    </div>
  );
}
