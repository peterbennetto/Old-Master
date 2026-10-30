// app/api/transcribe/route.ts
//
// EARS — Speech-to-Text via Gemini.
// Receives an audio recording from the browser, returns the transcript.
// Voice path only — the text-input path skips this route entirely.

import { NextRequest, NextResponse } from "next/server";
import { getGemini, GEMINI_STT_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over 4.5 MB, so fail early with a clear message.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const TRANSCRIBE_PROMPT =
  "Transcribe the speech in this audio exactly as spoken. Reply with only " +
  "the transcript — no commentary, labels or quotation marks. If there is no " +
  "intelligible speech, reply with nothing.";

/**
 * MediaRecorder reports types like "audio/webm;codecs=opus" (Chrome),
 * "audio/ogg;codecs=opus" (Firefox) or "audio/mp4" (Safari). Gemini wants the
 * bare type, and lists MP4/AAC audio as "audio/m4a".
 */
function normalizeAudioMime(type: string): string {
  const base = type.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "video/mp4") return "audio/m4a";
  if (base === "video/webm") return "audio/webm";
  return base || "audio/webm";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file received." },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Recording is too long." },
        { status: 413 }
      );
    }

    const data = Buffer.from(await audioFile.arrayBuffer()).toString("base64");

    const response = await getGemini().models.generateContent({
      model: GEMINI_STT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: TRANSCRIBE_PROMPT },
            {
              inlineData: {
                mimeType: normalizeAudioMime(audioFile.type),
                data,
              },
            },
          ],
        },
      ],
    });

    // An empty transcript (silence, background noise) is a normal result,
    // not an error — the client decides what to tell the user.
    return NextResponse.json({ transcript: (response.text ?? "").trim() });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed." },
      { status: 500 }
    );
  }
}
