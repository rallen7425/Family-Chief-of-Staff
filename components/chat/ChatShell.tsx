"use client";

import { useChat } from "@/components/chat/ChatProvider";
import { ChatBar } from "@/components/chat/ChatBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ArrivalBufferRule } from "@/lib/arrival";
import type { FamilyMember } from "@/lib/types";

export function ChatShell({
  familyMembers,
  arrivalRules,
}: {
  familyMembers: FamilyMember[];
  arrivalRules: ArrivalBufferRule[];
}) {
  const { isOpen } = useChat();
  return isOpen ? (
    <ChatPanel familyMembers={familyMembers} arrivalRules={arrivalRules} />
  ) : (
    <ChatBar />
  );
}
