"use client";

import { Plus, Mic, AudioLines } from "lucide-react";
import { useChat } from "@/components/chat/ChatProvider";

export function ChatBar() {
  const { inputValue, setInputValue, sendMessage, isSending, openPanel } = useChat();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  return (
    <div className="fixed left-0 right-0 w-full max-w-[430px] mx-auto px-6 z-40 pointer-events-none flex justify-center bottom-6">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto bg-surface/90 backdrop-blur-md rounded-pill border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pr-4 flex items-center gap-3 w-[90%] transition-transform hover:scale-[1.02]"
      >
        <button
          type="button"
          onClick={openPanel}
          aria-label="Open chat"
          className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
        >
          <Plus size={22} strokeWidth={2} />
        </button>
        <input
          className="flex-1 bg-transparent border-none p-0 text-[15px] font-medium text-ink placeholder:text-muted-label focus:ring-0 focus:outline-none"
          placeholder="Chat with Rufus..."
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={openPanel}
          disabled={isSending}
        />
        <div className="flex items-center gap-1 text-muted-label shrink-0">
          <button
            type="button"
            aria-label="Voice input"
            className="w-10 h-10 rounded-full hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
          >
            <Mic size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Voice mode"
            className="w-10 h-10 rounded-full hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
          >
            <AudioLines size={20} strokeWidth={2} />
          </button>
        </div>
      </form>
    </div>
  );
}
