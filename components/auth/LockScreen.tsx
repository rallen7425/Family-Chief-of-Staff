import { MemberPicker } from "@/components/auth/MemberPicker";
import { ASSISTANT_NAME } from "@/lib/config";
import type { FamilyMember } from "@/lib/types";

/**
 * Shown in place of the whole app after "Log out" — a pre-auth stand-in for
 * a sign-in screen. Picking a person unlocks the device. No password: the
 * real security boundary is still the server-only data layer.
 */
export function LockScreen({ members }: { members: FamilyMember[] }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-label">
          {ASSISTANT_NAME}
        </p>
        <h1 className="font-display text-[26px] font-semibold leading-tight text-ink">
          Who&rsquo;s using the app?
        </h1>
        <p className="text-[13px] text-muted-text">
          Pick your profile to continue. You can switch anytime from Settings.
        </p>
      </div>
      <MemberPicker members={members} />
    </div>
  );
}
