// types/index.ts
//
// Shared types used across API routes and components.

/**
 * The bot's current stage, per the Structure/UI spec:
 * idle → listening/typing → transcribing (voice only) → thinking → speaking → idle
 */
export type BotState =
  | "idle"
  | "listening"
  | "typing"
  | "transcribing"
  | "thinking"
  | "speaking";

/**
 * A single turn in the conversation, kept in React state only
 * (no database, per spec).
 */
export type ConversationTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** How the user's turn was captured. Not set on assistant turns. */
  inputMode?: "voice" | "text";
};

/** Request body for POST /api/transcribe */
export type TranscribeRequest = {
  audio: Blob;
};

/** Response body from POST /api/transcribe */
export type TranscribeResponse = {
  transcript: string;
};

/** Request body for POST /api/chat */
export type ChatRequest = {
  /** Full conversation history so far, oldest first. */
  messages: ConversationTurn[];
};

/** Request body for POST /api/speak */
export type SpeakRequest = {
  text: string;
};