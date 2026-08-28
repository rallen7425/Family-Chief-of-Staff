import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import type { Todo } from "@/lib/types";
import type { EntryRow } from "@/lib/data/dbTypes";

function mapTodo(row: EntryRow): Todo {
  return {
    id: row.id,
    title: row.title,
    familyMemberId: row.subject_member_id,
    dueDate: row.due_at ?? undefined,
    completed: row.completed_at != null,
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
  };
}

export async function getTodos(personId?: string | null): Promise<Todo[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from("entries").select("*").eq("kind", "task").order("created_at");
  if (personId && personId !== "all") {
    query = query.eq("subject_member_id", personId);
  }
  const { data, error } = await query.returns<EntryRow[]>();
  if (error) throw error;
  return data.map(mapTodo);
}

export async function getIncompleteTodos(limit: number): Promise<Todo[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("kind", "task")
    .is("completed_at", null)
    .order("created_at")
    .limit(limit)
    .returns<EntryRow[]>();
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
    .select("*")
    .eq("kind", "task")
    .is("completed_at", null)
    .neq("status", "dismissed")
    .not("due_at", "is", null)
    .lte("due_at", today)
    .order("due_at")
    .returns<EntryRow[]>();
  if (error) throw error;
  return data.map(mapTodo);
});

export const getPendingReviewTodos = cache(async (): Promise<Todo[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("kind", "task")
    .eq("status", "pending_review")
    .order("created_at")
    .returns<EntryRow[]>();
  if (error) throw error;
  return data.map(mapTodo);
});
