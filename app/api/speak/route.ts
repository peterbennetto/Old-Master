// app/api/speak/route.ts
//
// MOUTH — Text-to-Speech via Gemini TTS.
// Takes the Brain's completed response text and returns one audio clip.
// Only called once the full response text is ready — never mid-stream.

import { NextRequest, NextResponse } from "next/server";
import {
  getGemini,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICE,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SPEECH_CHARS = 4000;

// Gemini TTS reads `text` verbatim, so delivery is steered separately.
const SPEECH_STYLE = "speaking slowly, warm and thoughtful";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string | undefined = body.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text received to speak." },
        { status: 400 }
      );
    }

    if (text.length > MAX_SPEECH_CHARS) {
      return NextResponse.json(
        { error: "Text is too long to speak." },
        { status: 400 }
      );
    }

    // store: false keeps the request out of Google's saved interaction history.
    const interaction = await getGemini().interactions.create({
      model: GEMINI_TTS_MODEL,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: text.trim(),
              annotations: [{ type: "speech_metadata", style: SPEECH_STYLE }],
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: GEMINI_TTS_VOICE }] },
      store: false,
    });

    const audio = interaction.output_audio;
    if (!audio?.data) {
      throw new Error("Gemini TTS returned no audio.");
    }

    // Unary responses come back as a complete WAV file (24 kHz, 16-bit mono),
    // which browsers play directly.
    const audioBytes = Buffer.from(audio.data, "base64");

    return new NextResponse(audioBytes, {
      headers: {
        "Content-Type": audio.mime_type || "audio/wav",
        "Content-Length": audioBytes.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Speech generation failed." },
      { status: 500 }
    );
  }
}
