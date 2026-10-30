// app/api/chat/route.ts
//
// BRAIN — takes the conversation history, prepends the persona system
// prompt, and streams the response back as plain text chunks.
// Used by both the voice path and the text path — same route, same persona.

import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, FALLBACK_LINE } from "@/lib/prompts";
import { streamBrainResponse, ChatMessage } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bounds on what a client may send, so a public deployment can't be used to
// push huge prompts through the API key.
const MAX_TURNS = 20;
const MAX_TURN_CHARS = 2000;

/**
 * Keeps only well-formed user/assistant turns. Roles come from the browser,
 * so anything else (notably "system") is dropped rather than trusted.
 */
function sanitizeTurns(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];

  const turns: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof text !== "string" || text.trim().length === 0) continue;
    turns.push({ role, content: text.trim().slice(0, MAX_TURN_CHARS) });
  }
  return turns.slice(-MAX_TURNS);
}

function fallbackResponse() {
  // In-character fallback, never a raw error, per spec.
  return new NextResponse(FALLBACK_LINE, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const turns = sanitizeTurns(body?.messages);

    if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "No messages received." },
        { status: 400 }
      );
    }

    // Persona prompt is prepended to the plain role/content turns.
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...turns,
    ];

    // The provider only calls the API once iteration starts, so pull the first
    // chunk here. A bad key, exhausted quota or blocked reply fails now —
    // while we can still answer with the fallback line — instead of
    // surfacing as an empty stream.
    const iterator = (await streamBrainResponse(messages))[
      Symbol.asyncIterator
    ]();
    let first: IteratorResult<string>;
    try {
      first = await iterator.next();
    } catch (providerError) {
      console.error("Brain provider error:", providerError);
      return fallbackResponse();
    }
    if (first.done) {
      console.error("Brain provider returned no text.");
      return fallbackResponse();
    }

    // Stream the response back as plain text chunks so the client
    // can render it live as it arrives.
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(first.value));
          while (true) {
            const next = await iterator.next();
            if (next.done) break;
            controller.enqueue(encoder.encode(next.value));
          }
          controller.close();
        } catch (streamError) {
          console.error("Streaming interrupted:", streamError);
          // Error the stream rather than closing it cleanly, so the client
          // can tell the reply is incomplete and skip text-to-speech.
          // Partial text already sent stays visible.
          controller.error(streamError);
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return fallbackResponse();
  }
}
