"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { SettingsRowContent, settingsRowClass } from "@/components/settings/SettingsRow";
import { logOut } from "@/lib/actions/familyMembers";

export function LogOutRow() {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => start(async () => {
        await logOut();
        router.refresh();
      })}
      className={`${settingsRowClass} disabled:opacity-60`}
    >
      <SettingsRowContent
        icon={LogOut}
        iconBg="#FDF1EF"
        iconColor="#E8567A"
        label="Log out"
        sub="Return to the profile chooser"
      />
    </button>
  );
}
