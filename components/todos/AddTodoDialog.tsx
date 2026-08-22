"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { TodoForm } from "@/components/todos/TodoForm";
import { createTodo } from "@/lib/actions/todos";
import type { FamilyMember } from "@/lib/types";

export function AddTodoDialog({ familyMembers }: { familyMembers: FamilyMember[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add todo"
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Todo">
        <TodoForm
          familyMembers={familyMembers}
          submitLabel="Add Todo"
          onSubmit={createTodo}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
