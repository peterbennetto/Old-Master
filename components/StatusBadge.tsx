// components/StatusBadge.tsx
//
// Small status indicator for the bot's current stage. Each state gets a
// distinct colour cue and in-character label, per the UI/Theme spec.

import { BotState } from "@/types";

type StatusBadgeProps = {
  state: BotState;
};

const STATE_CONFIG: Record<
  BotState,
  { label: string; colorClass: string; pulse: boolean }
> = {
  idle: {
    label: "Awaiting your question",
    colorClass: "bg-master-muted",
    pulse: false,
  },
  listening: {
    label: "Listening...",
    colorClass: "bg-master-gold",
    pulse: true,
  },
  typing: {
    label: "Typing...",
    colorClass: "bg-master-green",
    pulse: false,
  },
  transcribing: {
    label: "Hearing your words, I am...",
    colorClass: "bg-master-gold",
    pulse: true,
  },
  thinking: {
    label: "Meditating on this, I am...",
    colorClass: "bg-master-green",
    pulse: true,
  },
  speaking: {
    label: "Speaking...",
    colorClass: "bg-master-gold",
    pulse: true,
  },
};

export default function StatusBadge({ state }: StatusBadgeProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${config.colorClass} ${
          config.pulse ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      />
      <p className="text-sm text-master-muted">{config.label}</p>
    </div>
  );
}