import Link from "next/link";
import { User, Users, Mail, Settings } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { SettingsRowContent, settingsRowClass } from "@/components/settings/SettingsRow";
import { PrivacyRow } from "@/components/settings/PrivacyRow";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);
  const isHoH = activeMember?.isHeadOfHousehold ?? false;

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Settings</h1>

      <div className="bg-surface rounded-card overflow-hidden shadow-sm shadow-black/5">
        <Link href="/profile" className={settingsRowClass}>
          <SettingsRowContent
            icon={User}
            iconBg="#EEF2FB"
            iconColor="#3B6FE5"
            label="My Profile"
            sub="Your name, color, and details"
          />
        </Link>

        <Link href="/family" className={settingsRowClass}>
          <SettingsRowContent
            icon={Users}
            iconBg="#F3EEF9"
            iconColor="#7C5CBF"
            label="Manage Family"
            sub="Home location, members, roles, arrival defaults"
          />
        </Link>

        {isHoH && (
          <Link href="/settings/accounts" className={settingsRowClass}>
            <SettingsRowContent
              icon={Mail}
              iconBg="#EEF2FB"
              iconColor="#3B6FE5"
              label="Manage Connected Accounts"
              sub="Email and calendar, grouped by household member"
            />
          </Link>
        )}

        <Link href="/settings/app" className={settingsRowClass}>
          <SettingsRowContent
            icon={Settings}
            iconBg="#EEF2FB"
            iconColor="#3B6FE5"
            label="Settings"
            sub="App preferences"
          />
        </Link>

        <PrivacyRow members={familyMembers} />
      </div>
    </>
  );
}
