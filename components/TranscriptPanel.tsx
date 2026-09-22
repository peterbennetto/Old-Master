// components/TranscriptPanel.tsx
//
// Secondary display area for the user's own input — the Whisper transcript
// (voice path) or the submitted text (text path). Deliberately smaller and
// plainer than ResponsePanel, so it doesn't compete with the "wisdom" area.

type TranscriptPanelProps = {
  /** The user's question, once known. Empty/undefined before anything is submitted. */
  transcript?: string;
  /** True while waiting on Whisper (voice path only). */
  isTranscribing: boolean;
};

export default function TranscriptPanel({
  transcript,
  isTranscribing,
}: TranscriptPanelProps) {
  if (!isTranscribing && !transcript) {
    // Nothing submitted yet — render nothing rather than an empty box.
    return null;
  }

  return (
    <div className="w-full max-w-md rounded-md border border-master-brown/60 bg-master-panel/60 px-4 py-2">
      <p className="text-xs uppercase tracking-wide text-master-muted">
        You asked
      </p>
      {isTranscribing ? (
        <p className="text-sm italic text-master-muted">Listening still, I am...</p>
      ) : (
        <p className="text-sm text-master-text">{transcript}</p>
      )}
    </div>
  );
}