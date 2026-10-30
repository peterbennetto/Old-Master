// lib/providers.ts
//
// Provider-swap logic for the Brain (LLM) step only. Speech-to-text (Ears) and
// text-to-speech (Mouth) live directly in their own API routes, not here.
//
// This file has no knowledge of persona content (see lib/prompts.ts).
// Swapping providers here never requires touching the persona file.

import { getGemini, GEMINI_CHAT_MODEL } from "@/lib/gemini";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type BrainProvider = "gemini" | "claude";

// Which provider is active. Change this one line to switch providers —
// nothing else in the app needs to change.
const ACTIVE_PROVIDER: BrainProvider = "gemini";

/**
 * Streams a chat completion from the active provider. Returns an async
 * iterable of text chunks so the caller (app/api/chat/route.ts) can
 * forward them to the client as they arrive.
 *
 * The provider call itself starts on first iteration, not when this function
 * returns — so the caller must pull the first chunk before treating the
 * provider as healthy.
 */
export async function streamBrainResponse(
  messages: ChatMessage[]
): Promise<AsyncIterable<string>> {
  if (ACTIVE_PROVIDER === "gemini") {
    return streamFromGemini(messages);
  }

  if (ACTIVE_PROVIDER === "claude") {
    throw new Error(
      "Claude provider is not yet wired up. Add @anthropic-ai/sdk and " +
        "implement streamFromClaude() before setting ACTIVE_PROVIDER to 'claude'."
    );
  }

  throw new Error(`Unknown provider: ${ACTIVE_PROVIDER}`);
}

/**
 * Gemini takes the persona as a separate systemInstruction and labels the
 * assistant role "model". It also wants alternating roles starting with a
 * user turn, so consecutive same-role turns (e.g. after a failed request)
 * are merged and any leading assistant turns are dropped.
 */
function toGeminiConversation(messages: ChatMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const turns: { role: "user" | "model"; text: string }[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const role = message.role === "assistant" ? "model" : "user";
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.text += `\n\n${message.content}`;
    } else {
      turns.push({ role, text: message.content });
    }
  }
  while (turns.length > 0 && turns[0].role !== "user") {
    turns.shift();
  }

  return {
    system,
    contents: turns.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
  };
}

async function* streamFromGemini(
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const { system, contents } = toGeminiConversation(messages);

  // No temperature: the current Gemini 3.x models ignore custom sampling
  // values and warn about them.
  const stream = await getGemini().models.generateContentStream({
    model: GEMINI_CHAT_MODEL,
    contents,
    config: { systemInstruction: system },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

// Placeholder for future Claude support. Left commented rather than
// half-implemented, per the "no fabricated libraries/parameters" rule —
// filling this in requires adding @anthropic-ai/sdk to package.json first.
//
// async function* streamFromClaude(
//   messages: ChatMessage[]
// ): AsyncGenerator<string> {
//   ...
// }
