// lib/providers.ts
//
// Provider-swap logic for the Brain (LLM) step only. Whisper (STT) and
// OpenAI TTS (Mouth) are fixed per the build spec and live directly in
// their own API routes, not here.
//
// This file has no knowledge of persona content (see lib/prompts.ts).
// Swapping providers here never requires touching the persona file.

import OpenAI from "openai";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type BrainProvider = "openai" | "claude";

// Which provider is active. Change this one line to switch providers —
// nothing else in the app needs to change.
const ACTIVE_PROVIDER: BrainProvider = "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Streams a chat completion from the active provider. Returns an async
 * iterable of text chunks so the caller (app/api/chat/route.ts) can
 * forward them to the client as they arrive.
 */
export async function streamBrainResponse(
  messages: ChatMessage[]
): Promise<AsyncIterable<string>> {
  if (ACTIVE_PROVIDER === "openai") {
    return streamFromOpenAI(messages);
  }

  if (ACTIVE_PROVIDER === "claude") {
    throw new Error(
      "Claude provider is not yet wired up. Add @anthropic-ai/sdk and " +
        "implement streamFromClaude() before setting ACTIVE_PROVIDER to 'claude'."
    );
  }

  throw new Error(`Unknown provider: ${ACTIVE_PROVIDER}`);
}

async function* streamFromOpenAI(
  messages: ChatMessage[]
): AsyncGenerator<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in .env.local");
  }

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.8,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
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