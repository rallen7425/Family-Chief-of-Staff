"use client";

import { useState } from "react";
import Link from "next/link";
import { SEVERITY_DOT } from "@/components/notifications/severity";
import { NotificationDismissButton } from "@/components/notifications/NotificationDismissButton";
import { EntryDetailsModal } from "@/components/entries/EntryDetailsModal";
import { useEntryEditing } from "@/components/entries/EntryEditingContext";
import type { Notification } from "@/lib/notifications";
import type { FamilyMember } from "@/lib/types";

/** One row in the /notifications feed: severity dot + title + optional
 * detail. When the notification has a single backing entry (advisory,
 * action-soon event, deadline task), the row opens that entry's own
 * EntryDetailsModal — owner, category, additional context, visible to,
 * history, edit — instead of navigating off to a generic list page. Rows
 * with no backing entry (the aggregate review nudge) still just link. Plus
 * a dismiss control for `dismissible` rows. */
export function NotificationRow({ n, familyMembers }: { n: Notification; familyMembers: FamilyMember[] }) {
  const [open, setOpen] = useState(false);
  const { arrivalRules, linkables, activitiesByMember } = useEntryEditing();

  const body = (
    <>
      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink leading-snug">{n.title}</p>
        {n.detail && <p className="text-[12px] text-muted-label mt-0.5 leading-snug">{n.detail}</p>}
      </div>
    </>
  );

  return (
    <div className="flex items-start gap-2.5">
      {n.entry ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 items-start gap-2.5 min-w-0 text-left"
        >
          {body}
        </button>
      ) : n.href ? (
        <Link href={n.href} className="flex flex-1 items-start gap-2.5 min-w-0">
          {body}
        </Link>
      ) : (
        <div className="flex flex-1 items-start gap-2.5 min-w-0">{body}</div>
      )}
      {n.dismissible && <NotificationDismissButton id={n.id} />}
      {n.entry && open && (
        <EntryDetailsModal
          event={n.entry}
          familyMembers={familyMembers}
          arrivalRules={arrivalRules}
          linkables={linkables}
          activitiesByMember={activitiesByMember}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
