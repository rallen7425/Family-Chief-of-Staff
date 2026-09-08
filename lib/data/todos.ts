import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { isPastReviewEntry } from "@/lib/reviewExpiry";
import { mapEvent } from "@/lib/data/events";
import type { CalendarEvent, Todo } from "@/lib/types";
import type { EntryRow } from "@/lib/data/dbTypes";

type EntryRowWithOwners = EntryRow & { entry_owners: { family_member_id: string }[] | null };

const SELECT_WITH_OWNERS = "*, entry_owners(family_member_id)";

function mapTodo(row: EntryRowWithOwners): Todo {
  return {
    id: row.id,
    title: row.title,
    familyMemberId: row.subject_member_id,
    ownerMemberIds: (row.entry_owners ?? []).map((o) => o.family_member_id),
    dueDate: row.due_at ?? undefined,
    notes: row.notes ?? undefined,
    completed: row.completed_at != null,
    isCritical: row.is_critical ?? false,
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
  };
}

/** Full-detail todos for the UI list views (Today's preview, the full
 * `/todo` page) — CalendarEvent-shaped (via the same `mapEvent` events use)
 * so those lists can reuse EventRow/EntryDetailsModal for click-to-details
 * (owner, category, additional context, visible to, history) instead of a
 * parallel todo-only detail view. */
export async function getTodos(personId?: string | null): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("kind", "task")
    .order("created_at");
  if (personId && personId !== "all") {
    query = query.eq("subject_member_id", personId);
  }
  const { data, error } = await query.returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent);
}

export async function getIncompleteTodos(limit: number): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("kind", "task")
    .is("completed_at", null)
    .order("created_at")
    .limit(limit)
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent);
}

/** Todos due today or already overdue, not yet completed — regardless of
 * review status, since the real-world action they represent (bring a water
 * bottle, sign a form) doesn't wait on the item being formally reviewed.
 * Not limited to any one source, but excludes dismissed items.
 *
 * CalendarEvent-shaped (not the thin `Todo`) so the deadline notifications
 * built from these can open the same EntryDetailsModal as everywhere else,
 * instead of only linking off to the full /todo list. */
export const getUrgentTodos = cache(async (): Promise<CalendarEvent[]> => {
  const supabase = getSupabaseClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("kind", "task")
    .is("completed_at", null)
    .neq("status", "dismissed")
    .not("due_at", "is", null)
    .lte("due_at", today)
    .order("due_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data.map(mapEvent);
});

/** Past-due tasks are dropped here (view-time only, status untouched) so the
 * approval badge matches the /review list — see getPendingReviewEntries.
 * A task with no due date never expires. Overdue-but-actionable tasks still
 * surface via getUrgentTodos, which is deliberately independent of this. */
export const getPendingReviewTodos = cache(async (): Promise<Todo[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_OWNERS)
    .eq("kind", "task")
    .eq("status", "pending_review")
    .order("created_at")
    .returns<EntryRowWithOwners[]>();
  if (error) throw error;
  return data
    .map(mapTodo)
    .filter((todo) => !isPastReviewEntry({ kind: "task", dueDate: todo.dueDate }));
});
