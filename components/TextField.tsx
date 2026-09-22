// components/TextField.tsx
//
// Secondary input control. Always visible alongside MicButton, not behind
// a toggle. Skips /api/transcribe entirely — submitted text goes straight
// to the parent, which then follows the same /api/chat flow as the voice path.

"use client";

import { useState, KeyboardEvent } from "react";

type TextFieldProps = {
  /** Disabled while a question (voice or text) is already in flight. */
  disabled: boolean;
  /** Fired when the user submits non-empty text (Enter key or button click). */
  onSubmit: (text: string) => void;
};

export default function TextField({ disabled, onSubmit }: TextFieldProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSubmit();
    }
  }

  return (
    <div className="flex w-full max-w-md items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask, you may..."
        aria-label="Type your question"
        className={`
          flex-1 rounded-md border border-master-brown bg-master-panel
          px-4 py-2 text-master-text placeholder:text-master-muted
          focus:border-master-gold focus:outline-none
          ${disabled ? "cursor-not-allowed opacity-40" : ""}
        `}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Submit question"
        className={`
          rounded-md border border-master-green bg-master-panel px-4 py-2
          text-master-text transition-colors
          ${
            disabled || !value.trim()
              ? "cursor-not-allowed opacity-40"
              : "cursor-pointer hover:border-master-gold"
          }
        `}
      >
        Send
      </button>
    </div>
  );
}