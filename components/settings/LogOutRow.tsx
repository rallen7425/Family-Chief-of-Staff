"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { SettingsRowContent, settingsRowClass } from "@/components/settings/SettingsRow";
import { signOutAction } from "@/lib/actions/auth";

export function LogOutRow() {
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => start(() => signOutAction())}
      className={`${settingsRowClass} disabled:opacity-60`}
    >
      <SettingsRowContent
        icon={LogOut}
        iconBg="#FDF1EF"
        iconColor="#E8567A"
        label="Log out"
        sub="Sign in as someone else from here"
      />
    </button>
  );
}
