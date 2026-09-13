import { getTodos } from "@/lib/data/todos";
import { getLinkableOptions } from "@/lib/data/events";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { getActivitiesByMember } from "@/lib/data/memberDetails";
import { PersonFilter } from "@/components/shared/PersonFilter";
import { TodoList } from "@/components/todos/TodoList";
import { AddEntryDialog } from "@/components/entries/AddEntryDialog";
import { EntryEditingProvider } from "@/components/entries/EntryEditingContext";

export const dynamic = "force-dynamic";

export default async function TodoPage(props: PageProps<"/todo">) {
  const searchParams = await props.searchParams;
  const person = typeof searchParams.person === "string" ? searchParams.person : "all";

  const [todos, familyMembers, arrivalRules, activitiesByMember, linkables] = await Promise.all([
    getTodos(person),
    getFamilyMembers(),
    getArrivalBufferRules(),
    getActivitiesByMember(),
    getLinkableOptions(),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Todo</h1>
        <AddEntryDialog
          familyMembers={familyMembers}
          arrivalRules={arrivalRules}
          activitiesByMember={activitiesByMember}
          defaultKind="task"
          label="Add task"
        />
      </div>

      <PersonFilter
        familyMembers={familyMembers}
        selectedPersonId={person}
        buildHref={(personId) => `/todo?person=${personId}`}
      />

      <EntryEditingProvider
        arrivalRules={arrivalRules}
        linkables={linkables}
        activitiesByMember={activitiesByMember}
      >
        <TodoList todos={todos} familyMembers={familyMembers} />
      </EntryEditingProvider>
    </>
  );
}
