import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { buildSystemPrompt } from "@/lib/chat/systemPrompt";
import { CHAT_TOOLS, executeQuerySchedule, buildDraftFromToolUse } from "@/lib/chat/tools";
import type { ChatApiResponse, ChatMessage } from "@/lib/chat/types";

const client = new Anthropic();

// Up to MAX_ITERATIONS sequential Opus calls (a query_schedule round-trip
// between each) can run long; pin the ceiling explicitly rather than relying
// on the platform default, same as the gmail-scan route. 60s is the Vercel
// Hobby maximum.
export const maxDuration = 60;

const MAX_ITERATIONS = 4;

export async function POST(request: Request) {
  const body = await request.json();
  const message: string = typeof body.message === "string" ? body.message : "";
  const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

  if (!message.trim()) {
    return NextResponse.json<ChatApiResponse>({ error: "Message is required." }, { status: 400 });
  }

  const familyMembers = await getFamilyMembers();
  const system = buildSystemPrompt(familyMembers);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.text })),
    { role: "user", content: message },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      // Sonnet, not Opus — household Q&A + tool routing doesn't need Opus,
      // and this runs up to MAX_ITERATIONS times per chat turn.
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system,
      tools: CHAT_TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return NextResponse.json<ChatApiResponse>({ reply: textBlock?.text ?? "" });
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const draftBlock = toolUseBlocks.find(
      (b) => b.name === "create_event_draft" || b.name === "create_todo_draft"
    );

    if (draftBlock) {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return NextResponse.json<ChatApiResponse>({
        reply: textBlock?.text,
        draft: buildDraftFromToolUse(draftBlock, familyMembers),
      });
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tool of toolUseBlocks) {
      if (tool.name === "query_schedule") {
        const result = await executeQuerySchedule(tool.input, familyMembers);
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(result) });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: `Unknown tool: ${tool.name}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json<ChatApiResponse>({
    reply: "Sorry, I'm having trouble with that — could you try rephrasing?",
  });
}
