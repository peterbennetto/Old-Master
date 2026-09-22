// components/ResponsePanel.tsx
//
// Primary display area for the Brain's response. Larger and distinctly
// styled from TranscriptPanel — this is meant to feel like "wisdom",
// not plain chat output. Renders streamed text live as it arrives.

type ResponsePanelProps = {
  /** The response text so far — grows as streaming chunks arrive. */
  responseText: string;
  /** True while the Brain is still streaming (state === "thinking"). */
  isThinking: boolean;
  /** True while the TTS audio clip is playing back (state === "speaking"). */
  isSpeaking: boolean;
};

export default function ResponsePanel({
  responseText,
  isThinking,
  isSpeaking,
}: ResponsePanelProps) {
  if (!isThinking && !isSpeaking && !responseText) {
    // Nothing to show yet — idle state. Render nothing rather than an
    // empty box, matching TranscriptPanel's idle behaviour.
    return null;
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-master-gold/40 bg-master-panel px-6 py-5 shadow-lg shadow-black/30">
      <p className="mb-2 text-xs uppercase tracking-widest text-master-gold/80">
        The Old Master speaks
      </p>

      {isThinking && !responseText ? (
        <p className="font-serif text-lg italic text-master-muted">
          Meditating on this, I am...
        </p>
      ) : (
        <p className="font-serif text-lg leading-relaxed text-master-text">
          {responseText}
          {isThinking && (
            <span className="ml-1 inline-block animate-pulse text-master-gold">
              ▍
            </span>
          )}
        </p>
      )}

      {isSpeaking && (
        <p className="mt-3 text-xs text-master-gold/70">Speaking...</p>
      )}
    </div>
  );
}