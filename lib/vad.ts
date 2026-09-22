// lib/vad.ts
//
// Browser-side Voice Activity Detection (VAD), built on the native
// Web Audio API — no external VAD library, per spec.
//
// Watches the mic's volume level and calls onSilence() once volume has
// stayed below a threshold for a set duration, so recording can auto-stop
// instead of waiting for a manual stop button.

export type VADOptions = {
  /** Volume (0–255 scale) below which audio counts as "silence". */
  silenceThreshold?: number;
  /** How long silence must persist, in ms, before onSilence() fires. */
  silenceDurationMs?: number;
  /** Called once sustained silence is detected. */
  onSilence: () => void;
};

export type VADController = {
  /** Stops monitoring and releases audio resources. */
  stop: () => void;
};

/**
 * Starts monitoring a MediaStream for sustained silence.
 * Call stop() when recording ends manually, so resources are released
 * even if silence was never detected.
 */
export function startVAD(
  stream: MediaStream,
  options: VADOptions
): VADController {
  const { silenceThreshold = 12, silenceDurationMs = 1500, onSilence } =
    options;

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  let silenceStartedAt: number | null = null;
  let stopped = false;
  let rafId: number;

  function checkVolume() {
    if (stopped) return;

    analyser.getByteFrequencyData(dataArray);
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

    const now = performance.now();

    if (average < silenceThreshold) {
      if (silenceStartedAt === null) {
        silenceStartedAt = now;
      } else if (now - silenceStartedAt >= silenceDurationMs) {
        stopped = true;
        onSilence();
        return; // stop the loop; caller is expected to call stop() too
      }
    } else {
      silenceStartedAt = null;
    }

    rafId = requestAnimationFrame(checkVolume);
  }

  rafId = requestAnimationFrame(checkVolume);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      source.disconnect();
      audioContext.close();
    },
  };
}