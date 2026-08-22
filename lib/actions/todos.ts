"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

export interface TodoInput {
  title: string;
  familyMemberId: string | null;
  dueDate?: string; // YYYY-MM-DD
}

function revalidateTodoViews() {
  revalidatePath("/todo");
  revalidatePath("/");
}

export async function createTodo(input: TodoInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("todos").insert({
    title,
    family_member_id: input.familyMemberId,
    due_date: input.dueDate || null,
    status: "confirmed",
    source_type: "manual",
  });
  if (error) return { error: error.message };

  revalidateTodoViews();
  return {};
}

export async function toggleTodo(id: string, completed: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("todos")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidateTodoViews();
}
