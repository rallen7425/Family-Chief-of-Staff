"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { SettingsRowContent, settingsRowClass } from "@/components/settings/SettingsRow";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import type { FamilyMember } from "@/lib/types";

export function PrivacyRow({ members }: { members: FamilyMember[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={settingsRowClass}>
        <SettingsRowContent
          icon={Shield}
          iconBg="#FDF1EF"
          iconColor="#E8567A"
          label="Privacy"
          sub="Forget a person's info, or everything"
        />
      </button>
      <ForgetDialog open={open} onClose={() => setOpen(false)} members={members} />
    </>
  );
}
