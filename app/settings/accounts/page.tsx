import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Mail } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getAllEmailConnections } from "@/lib/data/emailConnections";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";
import type { EmailConnectionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<EmailConnectionSummary["status"], string> = {
  active: "Connected",
  paused: "Paused",
  needs_reconnect: "Needs reconnect",
  disconnected: "Disconnected",
};

const STATUS_CLASS: Record<EmailConnectionSummary["status"], string> = {
  active: "text-accent-teal bg-accent-teal/15",
  paused: "text-muted-label bg-border/50",
  needs_reconnect: "text-accent-berry bg-accent-berry/15",
  disconnected: "text-muted-label bg-border/50",
};

export default async function ConnectedAccountsPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);

  // HoH-gated — a UI convenience, not a security boundary (no auth exists).
  if (!activeMember?.isHeadOfHousehold) redirect("/settings");

  const connections = await getAllEmailConnections();
  const adults = familyMembers.filter((m) => m.isAdult);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[22px] leading-tight text-ink">
          Manage Connected Accounts
        </h1>
      </div>
      <p className="text-[12.5px] text-muted-label leading-relaxed">
        A read-only view of the whole household&rsquo;s connections, for keeping an eye on things.
        Each person connects, pauses, or removes their own accounts from their own Profile.
      </p>

      {adults.map((m) => {
        const memberConnections = connections.filter((c) => c.familyMemberId === m.id);
        return (
          <div key={m.id} className="bg-surface rounded-card p-4 flex flex-col gap-3 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                style={{ background: ACCENT_HEX[m.accentColor] }}
              >
                {initialsOf(m.name)}
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-ink">{m.name}</p>
                {m.relationship && <p className="text-[11.5px] text-muted-label">{m.relationship}</p>}
              </div>
            </div>

            {memberConnections.length === 0 ? (
              <p className="text-[12.5px] text-muted-label pl-10">Not connected</p>
            ) : (
              memberConnections.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-mist flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-muted-text" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink truncate">
                      {c.externalAccountEmail}
                    </p>
                    <p className="text-[12px] text-muted-label">
                      Gmail
                      {c.lastSyncedAt &&
                        ` — last synced ${formatDistanceToNow(new Date(c.lastSyncedAt), { addSuffix: true })}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10.5px] font-bold uppercase tracking-wide rounded-pill px-2 py-0.5 shrink-0 ${STATUS_CLASS[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        );
      })}

      <p className="text-[11.5px] text-muted-label leading-relaxed">
        Kids don&rsquo;t have their own connected accounts — nothing to manage there yet.
      </p>

      <p className="text-[11px] text-muted-label leading-relaxed border-t border-border pt-3.5">
        Calendar connections aren&rsquo;t available yet — coming in a future update. Email/calendar
        connections beyond Gmail (Microsoft 365, Outlook, Hotmail) are also planned.
      </p>
    </>
  );
}
