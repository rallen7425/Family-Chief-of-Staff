import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar, Mail, Plus } from "lucide-react";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getActiveMember } from "@/lib/activeMember";
import { getConnectedGmailAccount } from "@/lib/data/gmailCredentials";
import { initialsOf } from "@/lib/family";
import { ACCENT_HEX } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function ConnectedAccountsPage() {
  const familyMembers = await getFamilyMembers();
  const activeMember = await getActiveMember(familyMembers);

  // HoH-gated — a UI convenience, not a security boundary (no auth exists).
  if (!activeMember?.isHeadOfHousehold) redirect("/settings");

  const connectedEmail = await getConnectedGmailAccount();
  const adults = familyMembers.filter((m) => m.isAdult);
  // Attribute the one real connection to the adult whose email matches it,
  // else the first head-of-household adult.
  const ownerId =
    (connectedEmail &&
      adults.find((m) => m.email?.toLowerCase() === connectedEmail.toLowerCase())?.id) ||
    adults.find((m) => m.isHeadOfHousehold)?.id ||
    adults[0]?.id;

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
        Email and calendar connections for everyone in the household, in one place. Only head of
        household sees this page.
      </p>

      {adults.map((m) => {
        const connected = connectedEmail != null && m.id === ownerId;
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

            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-mist flex items-center justify-center shrink-0">
                <Mail size={15} className="text-muted-text" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">Email</p>
                <p className="text-[12px] text-muted-label truncate">
                  {connected ? `Gmail — ${connectedEmail}` : "Not connected"}
                </p>
              </div>
              {connected ? (
                <span className="text-[12.5px] font-semibold text-muted-label shrink-0">Connected</span>
              ) : (
                <span
                  className="text-[12.5px] font-semibold text-border shrink-0"
                  title="Each person connects their own account — per-member sign-in isn't built yet."
                >
                  Connect
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-mist flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-muted-label" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-muted-text">Calendar</p>
                <p className="text-[12px] text-muted-label">Not available yet</p>
              </div>
              <span className="text-[10px] font-bold text-muted-label bg-border/50 rounded-pill px-2 py-0.5 shrink-0">
                Coming soon
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-[11.5px] text-muted-label leading-relaxed">
        Kids don&rsquo;t have their own connected accounts — nothing to manage there yet.
      </p>

      <div className="flex items-center justify-center gap-2 py-3 rounded-input border border-dashed border-border text-border text-[14px] font-semibold">
        <Plus size={16} strokeWidth={2.5} /> Add a connected account
      </div>

      <p className="text-[11px] text-muted-label leading-relaxed border-t border-border pt-3.5">
        Today, Rufus reads from a single connected Gmail inbox for the whole household. Per-member
        connections shown here are the target model — each person will do their own one-time sign-in,
        the same way the current inbox is connected.
      </p>
    </>
  );
}
