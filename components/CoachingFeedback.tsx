"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CoachingMessage, CoachingLevel } from "@/types";

interface CoachingFeedbackProps {
  message: CoachingMessage;
  isActive: boolean;
}

const LEVEL_STYLE: Record<CoachingLevel, { border: string; icon: string; headlineColor: string }> = {
  WAITING:      { border: "border-zinc-700",        icon: "○", headlineColor: "text-zinc-400"   },
  EXCELLENT:    { border: "border-emerald-500/60",   icon: "✦", headlineColor: "text-emerald-400" },
  GOOD:         { border: "border-emerald-600/40",   icon: "✓", headlineColor: "text-emerald-400" },
  CORRECT_FAST: { border: "border-amber-500/40",     icon: "↓", headlineColor: "text-amber-400"   },
  CORRECT_SLOW: { border: "border-sky-500/40",       icon: "→", headlineColor: "text-sky-400"     },
  TOO_FAST:     { border: "border-orange-500/50",    icon: "⬇", headlineColor: "text-orange-400"  },
  TOO_SLOW:     { border: "border-blue-500/50",      icon: "⬆", headlineColor: "text-blue-400"    },
  HOLD_PAUSES:  { border: "border-violet-500/40",    icon: "⏸", headlineColor: "text-violet-400"  },
};

export default function CoachingFeedback({ message, isActive }: CoachingFeedbackProps) {
  const style = LEVEL_STYLE[message.level];

  return (
    <div className="w-full" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        <motion.div
          key={message.headline}
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={[
            "w-full rounded-xl border px-3 py-2.5 flex items-center gap-2.5",
            "bg-zinc-900/70",
            style.border,
            !isActive ? "opacity-40" : "",
          ].filter(Boolean).join(" ")}
        >
          <span className={`text-base leading-none flex-shrink-0 ${style.headlineColor}`} aria-hidden="true">
            {style.icon}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-xs font-bold leading-tight ${style.headlineColor}`}>
              {message.headline}
            </span>
            <span className="text-[10px] text-zinc-500 leading-snug truncate">
              {message.detail}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
