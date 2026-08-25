import { format } from "date-fns";
import { getPendingReviewEvents } from "@/lib/data/events";
import { getPendingReviewTodos } from "@/lib/data/todos";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { ReviewList, type ReviewGroup, type ReviewGroupItem } from "@/components/review/ReviewList";
import type { CalendarEvent, FamilyMember, SourceDetail, Todo } from "@/lib/types";

export const dynamic = "force-dynamic";

function personName(id: string | null, familyMembers: FamilyMember[]): string | undefined {
  if (!id) return undefined;
  return familyMembers.find((member) => member.id === id)?.name;
}

function groupKeyFor(sourceDetail: SourceDetail | undefined): string {
  return sourceDetail?.gmailMessageId ?? sourceDetail?.subject ?? "unknown";
}

function getOrCreateGroup(
  groups: Map<string, ReviewGroup>,
  sourceDetail: SourceDetail | undefined
): ReviewGroup {
  const key = groupKeyFor(sourceDetail);
  let group = groups.get(key);
  if (!group) {
    group = { key, subject: sourceDetail?.subject ?? "Manually added", sender: sourceDetail?.sender, items: [] };
    groups.set(key, group);
  }
  return group;
}

function eventToItem(event: CalendarEvent, familyMembers: FamilyMember[]): ReviewGroupItem {
  return {
    id: event.id,
    kind: "event",
    title: event.title,
    when: event.allDay
      ? `${format(new Date(event.startsAt), "EEE, MMM d")} (all day)`
      : format(new Date(event.startsAt), "EEE, MMM d 'at' h:mm a"),
    location: event.location,
    personName: personName(event.familyMemberId, familyMembers),
    fullEvent: event,
  };
}

function todoToItem(todo: Todo, familyMembers: FamilyMember[]): ReviewGroupItem {
  return {
    id: todo.id,
    kind: "todo",
    title: todo.title,
    when: todo.dueDate ? `Due ${format(new Date(`${todo.dueDate}T00:00:00`), "EEE, MMM d")}` : "No due date",
    personName: personName(todo.familyMemberId, familyMembers),
  };
}

export default async function ReviewPage() {
  const [events, todos, familyMembers] = await Promise.all([
    getPendingReviewEvents(),
    getPendingReviewTodos(),
    getFamilyMembers(),
  ]);

  const groups = new Map<string, ReviewGroup>();
  for (const event of events) {
    getOrCreateGroup(groups, event.sourceDetail).items.push(eventToItem(event, familyMembers));
  }
  for (const todo of todos) {
    getOrCreateGroup(groups, todo.sourceDetail).items.push(todoToItem(todo, familyMembers));
  }

  const groupList = Array.from(groups.values());

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Review New Entries</h1>
      {groupList.length === 0 ? (
        <section className="bg-surface rounded-card p-6 shadow-sm shadow-black/5">
          <p className="text-[14px] text-muted-label">Nothing waiting for review.</p>
        </section>
      ) : (
        <ReviewList groups={groupList} familyMembers={familyMembers} />
      )}
    </>
  );
}
