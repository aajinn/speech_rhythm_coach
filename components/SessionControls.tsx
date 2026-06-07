"use client";

import { motion } from "framer-motion";

interface SessionControlsProps {
  isRunning: boolean;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}

export default function SessionControls({
  isRunning, isMuted, onStart, onStop, onToggleMute,
}: SessionControlsProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      {/* Start */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        disabled={isRunning}
        aria-label="Start session"
        className={[
          "flex-1 h-10 rounded-xl font-semibold text-sm tracking-wide transition-colors",
          isRunning
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]",
        ].join(" ")}
      >
        Start
      </motion.button>

      {/* Stop */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onStop}
        disabled={!isRunning}
        aria-label="Stop session"
        className={[
          "flex-1 h-10 rounded-xl font-semibold text-sm tracking-wide transition-colors",
          !isRunning
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-zinc-700 hover:bg-zinc-600 text-zinc-100",
        ].join(" ")}
      >
        Stop
      </motion.button>

      {/* Mute — compact icon button */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute click" : "Mute click"}
        className={[
          "h-10 w-10 flex-shrink-0 rounded-xl text-base border transition-colors",
          isMuted
            ? "border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
            : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500",
        ].join(" ")}
      >
        {isMuted ? "🔇" : "🔊"}
      </motion.button>
    </div>
  );
}
