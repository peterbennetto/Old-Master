// lib/gemini.ts
//
// Shared Gemini client and model names for all three API routes
// (Ears, Brain, Mouth). The client is created on first use, never at import
// time, so `next build` succeeds even when GEMINI_API_KEY isn't present in
// the build environment.

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

// Defaults are free-tier models. Override any of them with an env var
// (see .env.local.example) without touching code, e.g. if Google retires a
// model or your free quota on one runs out.
export const GEMINI_CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL || "gemini-3.5-flash-lite";

// Speech-to-text is a plain multimodal prompt, so any chat model works.
export const GEMINI_STT_MODEL =
  process.env.GEMINI_STT_MODEL || "gemini-3.5-flash-lite";

export const GEMINI_TTS_MODEL =
  process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";

// "Gravelly" prebuilt voice — closest fit for an old master.
export const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Algenib";
