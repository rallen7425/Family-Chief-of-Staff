"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, X } from "lucide-react";
import { pauseConnection, resumeConnection, deleteConnection } from "@/lib/actions/emailConnections";
import type { EmailConnectionSummary } from "@/lib/types";

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

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "That connection attempt expired or was tampered with — try again.",
  not_signed_in: "You need to be signed in to connect an account.",
  no_refresh_token: "Google didn't return a usable grant — try again.",
  no_account_email: "Couldn't determine the connected account's email address.",
  already_connected_elsewhere: "That account is already connected to a different family member.",
  server_misconfigured: "Something's misconfigured on our end — try again later.",
  access_denied: "Google sign-in was cancelled.",
};

export function ConnectedAccounts({
  connections,
  connected,
  connectError,
}: {
  connections: EmailConnectionSummary[];
  connected?: string;
  connectError?: string;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState(
    connected ? { type: "success" as const, message: "Account connected." } : connectError
      ? { type: "error" as const, message: CONNECT_ERROR_MESSAGES[connectError] ?? connectError }
      : null
  );

  useEffect(() => {
    if (connected || connectError) {
      router.replace("/profile", { scroll: false });
    }
    // Only run once on mount for whatever query params landed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-surface rounded-card p-4 flex flex-col gap-3 shadow-sm shadow-black/5">
      <div>
        <p className="text-[14px] font-semibold text-ink">Connected accounts</p>
        <p className="text-[12px] text-muted-label mt-0.5">
          Email {"—"} only you can see or manage your own connections here.
        </p>
      </div>

      {banner && (
        <div
          className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium ${
            banner.type === "success" ? "bg-accent-teal/10 text-accent-teal" : "bg-accent-berry/10 text-accent-berry"
          }`}
        >
          <span>{banner.message}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss" className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {connections.length === 0 ? (
        <p className="text-[13px] text-muted-label">No connected accounts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {connections.map((c) => (
            <ConnectionRow key={c.id} connection={c} />
          ))}
        </div>
      )}

      <a
        href="/api/connectors/google/start"
        className="flex items-center justify-center gap-2 py-2.5 rounded-input border border-dashed border-border text-primary text-[13px] font-semibold hover:bg-mist transition-colors"
      >
        <Plus size={15} strokeWidth={2.5} /> Connect Gmail
      </a>
    </div>
  );
}

function ConnectionRow({ connection }: { connection: EmailConnectionSummary }) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="bg-mist rounded-[14px] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0">
          <Mail size={15} className="text-muted-text" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-ink truncate">{connection.externalAccountEmail}</p>
          <p className="text-[11.5px] text-muted-label">Gmail</p>
        </div>
        <span
          className={`text-[10.5px] font-bold uppercase tracking-wide rounded-pill px-2 py-0.5 shrink-0 ${STATUS_CLASS[connection.status]}`}
        >
          {STATUS_LABEL[connection.status]}
        </span>
      </div>

      {connection.lastError && connection.status === "needs_reconnect" && (
        <p className="text-[11.5px] text-accent-berry leading-relaxed">{connection.lastError}</p>
      )}
      {error && <p className="text-[11.5px] text-accent-berry font-medium">{error}</p>}

      <div className="flex items-center gap-3">
        {connection.status === "needs_reconnect" ? (
          <a
            href="/api/connectors/google/start"
            className="text-[12px] font-semibold text-primary"
          >
            Reconnect
          </a>
        ) : connection.status === "paused" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => resumeConnection(connection.id))}
            className="text-[12px] font-semibold text-primary disabled:opacity-60"
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => pauseConnection(connection.id))}
            className="text-[12px] font-semibold text-muted-text disabled:opacity-60"
          >
            Pause
          </button>
        )}

        {confirmingDelete ? (
          <span className="flex items-center gap-2 ml-auto">
            <span className="text-[11.5px] text-accent-berry font-medium">Delete this connection?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => deleteConnection(connection.id))}
              className="text-[12px] font-semibold text-accent-berry disabled:opacity-60"
            >
              {isPending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmingDelete(false)}
              className="text-[12px] font-semibold text-muted-text"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingDelete(true)}
            className="text-[12px] font-semibold text-accent-berry ml-auto disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
