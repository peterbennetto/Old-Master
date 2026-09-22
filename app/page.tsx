// app/page.tsx
//
// Main page. Owns conversation state and the bot's current stage.
// Both the voice path (MicButton) and text path (TextField) converge
// here into the same /api/chat -> /api/speak flow.

"use client";

import { useRef, useState } from "react";
import MicButton from "@/components/MicButton";
import TextField from "@/components/TextField";
import TranscriptPanel from "@/components/TranscriptPanel";
import ResponsePanel from "@/components/ResponsePanel";
import StatusBadge from "@/components/StatusBadge";
import { BotState, ConversationTurn } from "@/types";
import { FALLBACK_LINE } from "@/lib/prompts";

export default function Home() {
  const [botState, setBotState] = useState<BotState>("idle");
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inputs are locked whenever we're anywhere past idle in the flow.
  const inputsLocked = botState !== "idle";

  function resetToIdle() {
    setBotState("idle");
  }

  // ---- Shared flow: once we have question text (from either path) ----
  async function handleQuestion(text: string, inputMode: "voice" | "text") {
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      inputMode,
    };

    const updatedConversation = [...conversation, userTurn];
    setConversation(updatedConversation);
    setCurrentResponse("");
    setBotState("thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedConversation }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let streamCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamCompleted = true;
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setCurrentResponse(fullText);
      }

      const assistantTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: fullText,
      };
      setConversation((prev) => [...prev, assistantTurn]);

      // Streaming interruption: if we didn't reach `done` cleanly, or got
      // no text at all, skip TTS entirely per spec and release the lock.
      if (!streamCompleted || !fullText.trim()) {
        resetToIdle();
        return;
      }

      await speakResponse(fullText);
    } catch (error) {
      console.error("Chat flow error:", error);
      // Show the in-character fallback in the response panel itself,
      // skip TTS, release the lock.
      setCurrentResponse(FALLBACK_LINE);
      resetToIdle();
    }
  }

  // ---- TTS playback, only called on a complete response ----
  async function speakResponse(text: string) {
    setBotState("speaking");

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Speech request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioUrl;

      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resetToIdle();
      };
      audioRef.current.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        resetToIdle();
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("TTS/playback error:", error);
      // Response text is already shown — just skip audio and release the lock.
      resetToIdle();
    }
  }

  // ---- Voice path callbacks ----
  function handleRecordingStart() {
    setBotState("listening");
    setCurrentTranscript("");
  }

  function handleTranscribing() {
    setBotState("transcribing");
  }

  function handleTranscript(transcript: string) {
    setCurrentTranscript(transcript);
    handleQuestion(transcript, "voice");
  }

  function handleMicError(message: string) {
    console.error(message);
    resetToIdle();
  }

  // ---- Text path callback ----
  function handleTextSubmit(text: string) {
    setCurrentTranscript(text);
    handleQuestion(text, "text");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-master-bg px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-master-text">
          The Old Master
        </h1>
        <p className="mt-1 text-sm italic text-master-muted">
          A teacher who speaks in riddles, but means every word
        </p>
      </div>

      <StatusBadge state={botState} />

      <TranscriptPanel
        transcript={currentTranscript}
        isTranscribing={botState === "transcribing"}
      />

      <ResponsePanel
        responseText={currentResponse}
        isThinking={botState === "thinking"}
        isSpeaking={botState === "speaking"}
      />

      <div className="mt-4 flex flex-col items-center gap-4">
        <MicButton
          disabled={inputsLocked}
          onRecordingStart={handleRecordingStart}
          onTranscribing={handleTranscribing}
          onTranscript={handleTranscript}
          onError={handleMicError}
        />
        <TextField disabled={inputsLocked} onSubmit={handleTextSubmit} />
      </div>
    </main>
  );
}