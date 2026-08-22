import { MOCK_TODOS } from "@/lib/mockData";
import type { Todo } from "@/lib/types";

/** Phase 1: backed by in-memory mock data. Swaps to a Supabase query in Phase 3. */

export async function getTodos(personId?: string | null): Promise<Todo[]> {
  return MOCK_TODOS.filter((todo) => {
    if (personId && personId !== "all" && todo.familyMemberId !== personId) return false;
    return true;
  });
}

export async function getIncompleteTodos(limit: number): Promise<Todo[]> {
  return MOCK_TODOS.filter((todo) => !todo.completed).slice(0, limit);
}
