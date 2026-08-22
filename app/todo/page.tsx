import { getTodos } from "@/lib/data/todos";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { PersonFilter } from "@/components/shared/PersonFilter";
import { TodoList } from "@/components/todos/TodoList";

export default async function TodoPage(props: PageProps<"/todo">) {
  const searchParams = await props.searchParams;
  const person = typeof searchParams.person === "string" ? searchParams.person : "all";

  const [todos, familyMembers] = await Promise.all([getTodos(person), getFamilyMembers()]);

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Todo</h1>

      <PersonFilter
        familyMembers={familyMembers}
        selectedPersonId={person}
        buildHref={(personId) => `/todo?person=${personId}`}
      />

      <TodoList todos={todos} familyMembers={familyMembers} />
    </>
  );
}
