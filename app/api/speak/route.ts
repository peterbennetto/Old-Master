// app/api/speak/route.ts
//
// MOUTH — Text-to-Speech via OpenAI TTS.
// Takes the Brain's completed response text and returns one audio clip.
// Only called once the full response text is ready — never mid-stream.

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

    const body = await req.json();
    const text: string | undefined = body.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text received to speak." },
        { status: 400 }
      );
    }

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      speed: 0.85,
      input: text,
    });

        const audioArrayBuffer = await response.arrayBuffer();

    return new NextResponse(audioArrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioArrayBuffer.byteLength.toString(),
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