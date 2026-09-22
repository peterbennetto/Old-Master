// app/api/chat/route.ts
//
// BRAIN — takes the conversation history, prepends the persona system
// prompt, and streams the response back as plain text chunks.
// Used by both the voice path and the text path — same route, same persona.

import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, FALLBACK_LINE } from "@/lib/prompts";
import { streamBrainResponse, ChatMessage } from "@/lib/providers";
import { ConversationTurn } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const turns: ConversationTurn[] = body.messages ?? [];

    if (!Array.isArray(turns) || turns.length === 0) {
      return NextResponse.json(
        { error: "No messages received." },
        { status: 400 }
      );
    }

    // Convert conversation turns into the plain role/content shape
    // the Brain provider expects, with the persona prompt prepended.
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...turns.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
    ];

    let brainStream: AsyncIterable<string>;
    try {
      brainStream = await streamBrainResponse(messages);
    } catch (providerError) {
      console.error("Brain provider error:", providerError);
      // In-character fallback, never a raw error, per spec.
      return new NextResponse(FALLBACK_LINE, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Stream the response back as plain text chunks so the client
    // can render it live as it arrives.
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of brainStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (streamError) {
          console.error("Streaming interrupted:", streamError);
          // Partial text already sent stays visible on the client.
          // We don't send the fallback line mid-stream — that would
          // corrupt what's already been shown.
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return new NextResponse(FALLBACK_LINE, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}