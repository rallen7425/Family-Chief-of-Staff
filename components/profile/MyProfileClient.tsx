"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { InlineEditField } from "@/components/profile/InlineEditField";
import { ColorSwatchField } from "@/components/profile/ColorSwatchField";
import { ForgetDialog } from "@/components/settings/ForgetDialog";
import { updateProfileFields, setActiveMember } from "@/lib/actions/familyMembers";
import { ACCENT_HEX } from "@/lib/colors";
import type { AccentColor, FamilyMember } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_COLORS: AccentColor[] = ["coral", "teal", "gold", "berry", "blue", "purple"];

export function MyProfileClient({
  member,
  members,
}: {
  member: FamilyMember;
  members: FamilyMember[];
}) {
  const router = useRouter();
  const [forgetOpen, setForgetOpen] = useState(false);
  const [switching, startSwitch] = useTransition();

  return (
    <>
      <div className="bg-surface rounded-card p-5 flex flex-col gap-[18px] shadow-sm shadow-black/5">
        <InlineEditField
          label="Name"
          value={member.name}
          validate={(v) => (v.trim() ? null : "Name can't be blank.")}
          onSave={(v) => updateProfileFields(member.id, { name: v })}
        />
        <InlineEditField
          label="Relationship"
          value={member.relationship ?? ""}
          placeholder="e.g. Mom, Dad, Step-Dad, Grandma, Guardian"
          emptyText="Add relationship"
          validate={(v) => (v.trim() ? null : "Relationship can't be blank.")}
          onSave={(v) => updateProfileFields(member.id, { relationship: v })}
        />
        <InlineEditField
          label="Email address"
          value={member.email ?? ""}
          placeholder="e.g. name@example.com"
          emptyText="Add email address"
          validate={(v) => (!v.trim() || EMAIL_RE.test(v.trim()) ? null : "Enter a valid email address.")}
          onSave={(v) => updateProfileFields(member.id, { email: v })}
        />
        <InlineEditField
          label="Phone number"
          value={member.phone ?? ""}
          placeholder="e.g. (978) 555-0148"
          emptyText="Add phone number"
          validate={(v) => {
            const d = v.replace(/\D/g, "");
            return !v.trim() || (d.length >= 7 && d.length <= 15) ? null : "Enter a valid phone number.";
          }}
          onSave={(v) => updateProfileFields(member.id, { phone: v })}
        />
        <ColorSwatchField
          value={member.accentColor}
          colors={PROFILE_COLORS}
          onSave={(c) => updateProfileFields(member.id, { accentColor: c })}
        />
      </div>

      <div className="bg-surface rounded-card p-5 shadow-sm shadow-black/5">
        <p className="text-[12px] font-semibold text-muted-text uppercase tracking-[0.03em] mb-3">
          Switch profile
        </p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {members.map((m) => {
            const active = m.id === member.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={switching || active}
                onClick={() =>
                  startSwitch(async () => {
                    await setActiveMember(m.id);
                    router.refresh();
                  })
                }
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-pill text-[13px] shrink-0 transition-colors ${
                  active
                    ? "bg-primary text-white font-semibold"
                    : "bg-mist border border-border text-muted-text font-medium hover:bg-border/40"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: ACCENT_HEX[m.accentColor] }}
                />
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setForgetOpen(true)}
        className="flex items-center gap-2 py-1.5 text-accent-berry text-[13.5px] font-semibold self-start"
      >
        <Shield size={16} />
        Forget information
      </button>

      <ForgetDialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        members={members}
        defaultMemberId={member.id}
      />
    </>
  );
}
