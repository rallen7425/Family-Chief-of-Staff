"use client";

import { useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { useChat } from "@/components/chat/ChatProvider";
import { EventForm } from "@/components/events/EventForm";
import { TodoForm } from "@/components/todos/TodoForm";
import { createEventFromChat } from "@/lib/actions/events";
import { createTodoFromChat } from "@/lib/actions/todos";
import type { FamilyMember } from "@/lib/types";

interface ChatPanelProps {
  familyMembers: FamilyMember[];
}

export function ChatPanel({ familyMembers }: ChatPanelProps) {
  const {
    messages,
    draft,
    draftSourceMessage,
    isSending,
    inputValue,
    setInputValue,
    sendMessage,
    closePanel,
    clearDraft,
    resolveDraft,
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, draft]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={closePanel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Rufus"
        className="relative bg-mist w-full max-w-[430px] mx-auto flex flex-col mt-16 h-[calc(100vh-4rem)] rounded-t-card shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-[18px] text-ink">Chat with Rufus</h2>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-text hover:bg-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {messages.length === 0 && !draft && (
            <p className="text-[14px] text-muted-label text-center mt-8">
              Ask about the schedule, or tell me about an event or todo to add.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px]"
                    : "max-w-[80%] bg-surface text-ink rounded-2xl rounded-bl-sm px-4 py-2.5 text-[15px] border border-border"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-surface text-muted-label rounded-2xl rounded-bl-sm px-4 py-2.5 text-[15px] border border-border">
                …
              </div>
            </div>
          )}
          {draft && (
            <div className="bg-surface rounded-card p-5 border border-border mt-2">
              <p className="text-[12px] font-bold tracking-widest text-muted-text uppercase mb-3">
                {draft.kind === "event" ? "New Event" : "New Todo"}
              </p>
              {draft.kind === "event" ? (
                <EventForm
                  familyMembers={familyMembers}
                  initialValues={{
                    title: draft.title,
                    familyMemberId: draft.familyMemberId ?? "",
                    date: draft.date,
                    time: draft.time,
                    location: draft.location,
                    notes: draft.notes,
                  }}
                  submitLabel="Add to Schedule"
                  onSubmit={(input) =>
                    createEventFromChat(input, { message: draftSourceMessage ?? undefined })
                  }
                  onSuccess={() => resolveDraft(`Added "${draft.title}" to the schedule.`)}
                  onCancel={clearDraft}
                />
              ) : (
                <TodoForm
                  familyMembers={familyMembers}
                  initialValues={{
                    title: draft.title,
                    familyMemberId: draft.familyMemberId ?? "",
                    dueDate: draft.dueDate,
                  }}
                  submitLabel="Add to Todo"
                  onSubmit={(input) =>
                    createTodoFromChat(input, { message: draftSourceMessage ?? undefined })
                  }
                  onSuccess={() => resolveDraft(`Added "${draft.title}" to your todos.`)}
                  onCancel={clearDraft}
                />
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-4 py-3 border-t border-border bg-surface rounded-b-card shrink-0"
        >
          <input
            className="flex-1 bg-mist border border-border rounded-pill px-4 py-2.5 text-[15px] text-ink placeholder:text-muted-label focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Chat with Rufus..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            autoFocus
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            aria-label="Send"
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
