"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ChatApiResponse, ChatDraft, ChatMessage } from "@/lib/chat/types";

interface ChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  draft: ChatDraft | null;
  draftSourceMessage: string | null;
  isSending: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  openPanel: () => void;
  closePanel: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearDraft: () => void;
  resolveDraft: (confirmationText: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<ChatDraft | null>(null);
  const [draftSourceMessage, setDraftSourceMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);

  const clearDraft = useCallback(() => {
    setDraft(null);
    setDraftSourceMessage(null);
  }, []);

  const resolveDraft = useCallback((confirmationText: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: confirmationText }]);
    setDraft(null);
    setDraftSourceMessage(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
      const history = messages; // snapshot before appending the new message
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsOpen(true);
      setIsSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });
        const data: ChatApiResponse = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", text: `Sorry — ${data.error}` },
          ]);
          return;
        }

        if (data.reply) {
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: data.reply! }]);
        }

        if (data.draft) {
          setDraft(data.draft);
          setDraftSourceMessage(trimmed);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: "Sorry, something went wrong. Try again?" },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [messages]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      isOpen,
      messages,
      draft,
      draftSourceMessage,
      isSending,
      inputValue,
      setInputValue,
      openPanel,
      closePanel,
      sendMessage,
      clearDraft,
      resolveDraft,
    }),
    [
      isOpen,
      messages,
      draft,
      draftSourceMessage,
      isSending,
      inputValue,
      openPanel,
      closePanel,
      sendMessage,
      clearDraft,
      resolveDraft,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
