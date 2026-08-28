import { format } from "date-fns";
import { getPendingReviewEntries } from "@/lib/data/events";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { ReviewList, type ReviewGroup, type ReviewGroupItem } from "@/components/review/ReviewList";
import type { CalendarEvent, FamilyMember, SourceDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

function personName(id: string | null, familyMembers: FamilyMember[]): string | undefined {
  if (!id) return undefined;
  return familyMembers.find((member) => member.id === id)?.name;
}

function groupKeyFor(sourceDetail: SourceDetail | undefined): string {
  return sourceDetail?.gmailMessageId ?? sourceDetail?.subject ?? "unknown";
}

function getOrCreateGroup(groups: Map<string, ReviewGroup>, sourceDetail: SourceDetail | undefined): ReviewGroup {
  const key = groupKeyFor(sourceDetail);
  let group = groups.get(key);
  if (!group) {
    group = { key, subject: sourceDetail?.subject ?? "Manually added", sender: sourceDetail?.sender, items: [] };
    groups.set(key, group);
  }
  return group;
}

function whenLabel(entry: CalendarEvent): string {
  if (entry.kind === "task") {
    return entry.dueDate ? `Due ${format(new Date(`${entry.dueDate}T00:00:00`), "EEE, MMM d")}` : "No due date";
  }
  return entry.allDay
    ? `${format(new Date(entry.startsAt), "EEE, MMM d")} (all day)`
    : format(new Date(entry.startsAt), "EEE, MMM d 'at' h:mm a");
}

function toItem(entry: CalendarEvent, familyMembers: FamilyMember[]): ReviewGroupItem {
  return {
    id: entry.id,
    entryKind: entry.kind,
    title: entry.title,
    when: whenLabel(entry),
    location: entry.location,
    personName: personName(entry.familyMemberId, familyMembers),
    fullEvent: entry,
  };
}

export default async function ReviewPage() {
  const [entries, familyMembers, arrivalRules] = await Promise.all([
    getPendingReviewEntries(),
    getFamilyMembers(),
    getArrivalBufferRules(),
  ]);

  const groups = new Map<string, ReviewGroup>();
  for (const entry of entries) {
    getOrCreateGroup(groups, entry.sourceDetail).items.push(toItem(entry, familyMembers));
  }
  const groupList = Array.from(groups.values());

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Review New Entries</h1>
      {groupList.length === 0 ? (
        <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
          <p className="text-[14px] text-muted-label">All caught up — nothing left to review.</p>
        </section>
      ) : (
        <ReviewList groups={groupList} familyMembers={familyMembers} arrivalRules={arrivalRules} />
      )}
    </>
  );
}
