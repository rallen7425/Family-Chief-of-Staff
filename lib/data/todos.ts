import { getSupabaseClient } from "@/lib/supabase";
import type { Todo } from "@/lib/types";
import type { TodoRow } from "@/lib/data/dbTypes";

function mapTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    familyMemberId: row.family_member_id,
    dueDate: row.due_date ?? undefined,
    completed: row.completed,
    status: row.status,
    sourceType: row.source_type,
    sourceDetail: row.source_detail ?? undefined,
  };
}

export async function getTodos(personId?: string | null): Promise<Todo[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from("todos").select("*").order("created_at");
  if (personId && personId !== "all") {
    query = query.eq("family_member_id", personId);
  }
  const { data, error } = await query.returns<TodoRow[]>();
  if (error) throw error;
  return data.map(mapTodo);
}

export async function getIncompleteTodos(limit: number): Promise<Todo[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("completed", false)
    .order("created_at")
    .limit(limit)
    .returns<TodoRow[]>();
  if (error) throw error;
  return data.map(mapTodo);
}
