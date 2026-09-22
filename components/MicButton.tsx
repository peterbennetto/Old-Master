// components/MicButton.tsx
//
// Primary input control. Captures mic audio, auto-stops on silence (VAD),
// and posts the recording to /api/transcribe. Reports progress upward via
// callback props — this component doesn't own app-level state itself.

"use client";

import { useRef, useState } from "react";
import { startVAD, VADController } from "@/lib/vad";

type MicButtonProps = {
  /** Disabled while a text-mode question is in flight, or while this mic
   *  button's own flow is already running past the "listening" stage. */
  disabled: boolean;
  /** Fired the moment recording starts (state → "listening"). */
  onRecordingStart: () => void;
  /** Fired once recording stops and transcription begins (state → "transcribing"). */
  onTranscribing: () => void;
  /** Fired with the transcript once Whisper returns it. */
  onTranscript: (transcript: string) => void;
  /** Fired if mic access, recording, or transcription fails. Caller
   *  decides how to surface this (e.g. re-enable inputs, show fallback). */
  onError: (message: string) => void;
};

export default function MicButton({
  disabled,
  onRecordingStart,
  onTranscribing,
  onTranscript,
  onError,
}: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const vadRef = useRef<VADController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function handleClick() {
    if (disabled) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    await startRecording();
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        handleRecordingComplete();
      };

      recorder.start();
      setIsRecording(true);
      onRecordingStart();

      // Auto-stop on sustained silence.
      vadRef.current = startVAD(stream, {
        onSilence: () => stopRecording(),
      });
    } catch (error) {
      console.error("Mic access error:", error);
      onError(
        "Could not access the microphone. Check browser permissions and try again."
      );
    }
  }

  function stopRecording() {
    vadRef.current?.stop();
    vadRef.current = null;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setIsRecording(false);
  }

  async function handleRecordingComplete() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    if (blob.size === 0) {
      // No audio captured — don't submit an empty request, per spec.
      onError("No audio detected. Try again.");
      return;
    }

    onTranscribing();

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription request failed: ${response.status}`);
      }

      const data = await response.json();
      onTranscript(data.transcript);
    } catch (error) {
      console.error("Transcription error:", error);
      onError("Transcription failed. Try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isRecording}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      className={`
        flex h-20 w-20 items-center justify-center rounded-full
        border-2 transition-colors
        ${
          isRecording
            ? "border-master-gold bg-master-gold/20 animate-pulse"
            : "border-master-green bg-master-panel"
        }
        ${
          disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer hover:border-master-gold"
        }
      `}
    >
      <MicIcon isRecording={isRecording} />
    </button>
  );
}

function MicIcon({ isRecording }: { isRecording: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke={isRecording ? "#c9a24b" : "#e8e6df"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}