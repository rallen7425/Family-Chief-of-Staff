"use client";

import { useChat } from "@/components/chat/ChatProvider";
import { ChatBar } from "@/components/chat/ChatBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { FamilyMember } from "@/lib/types";

export function ChatShell({ familyMembers }: { familyMembers: FamilyMember[] }) {
  const { isOpen } = useChat();
  return isOpen ? <ChatPanel familyMembers={familyMembers} /> : <ChatBar />;
}
