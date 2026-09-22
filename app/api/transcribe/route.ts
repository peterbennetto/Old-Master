// app/api/transcribe/route.ts
//
// EARS — Speech-to-Text via OpenAI Whisper.
// Receives an audio recording from the browser, returns the transcript.
// Voice path only — the text-input path skips this route entirely.

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is not configured with an OpenAI API key." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file received." },
        { status: 400 }
      );
    }

    // Whisper's SDK expects a File-like object with a name/type.
    // The browser Blob from MediaRecorder doesn't carry a filename,
    // so we wrap it here before sending it on.
    const file = new File([audioFile], "recording.webm", {
      type: audioFile.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed." },
      { status: 500 }
    );
  }
}