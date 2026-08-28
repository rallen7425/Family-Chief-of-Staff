import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { isPastReviewEntry } from "@/lib/reviewExpiry";
import type { Todo } from "@/lib/types";
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
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
  };
}

export async function getTodos(personId?: string | null): Promise<Todo[]> {
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
  return data.map(mapTodo);
}

export async function getIncompleteTodos(limit: number): Promise<Todo[]> {
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
  return data.map(mapTodo);
}

/** Todos due today or already overdue, not yet completed — regardless of
 * review status, since the real-world action they represent (bring a water
 * bottle, sign a form) doesn't wait on the item being formally reviewed.
 * Not limited to any one source, but excludes dismissed items. */
export const getUrgentTodos = cache(async (): Promise<Todo[]> => {
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
  return data.map(mapTodo);
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
