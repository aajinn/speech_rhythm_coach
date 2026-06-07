"use client";

import { motion, AnimatePresence } from "framer-motion";
import RhythmMeter from "@/components/RhythmMeter";
import type { RhythmAnalysis, RhythmStatus, SessionMetrics } from "@/types";

interface RhythmDisplayProps {
  rhythm: RhythmAnalysis;
  metrics: SessionMetrics;
  volume: number;
  isSpeaking: boolean;
  isListening: boolean;
}

const STATUS_CONFIG: Record<RhythmStatus, { label: string; color: string; bg: string }> = {
  WAITING: { label: "Waiting for speech…",  color: "text-zinc-400",   bg: "bg-zinc-800/60"      },
  PERFECT: { label: "✦ Perfect Rhythm",     color: "text-emerald-400", bg: "bg-emerald-500/10"  },
  TOO_SLOW:{ label: "↓ Too Slow",           color: "text-blue-400",    bg: "bg-blue-500/10"     },
  TOO_FAST:{ label: "↑ Too Fast",           color: "text-orange-400",  bg: "bg-orange-500/10"   },
};

export default function RhythmDisplay({
  rhythm, metrics, volume, isSpeaking, isListening,
}: RhythmDisplayProps) {
  const { label, color, bg } = STATUS_CONFIG[rhythm.status];

  return (
    <div className="w-full flex flex-col gap-3">

      {/* ── BPM row ── */}
      <div className="flex items-center gap-2">
        {/* Target */}
        <div className="flex-1 flex flex-col items-center py-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Target</span>
          <span className="text-2xl font-bold tabular-nums text-violet-400 leading-none">{rhythm.targetBpm}</span>
          <span className="text-[9px] text-zinc-600">BPM</span>
        </div>

        <span className="text-zinc-700 text-sm">vs</span>

        {/* You */}
        <div className="flex-1 flex flex-col items-center py-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">You</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={rhythm.hasData ? Math.round(rhythm.currentBpm) : "wait"}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
              className="text-2xl font-bold tabular-nums text-zinc-100 leading-none"
            >
              {rhythm.hasData ? Math.round(rhythm.currentBpm) : "—"}
            </motion.span>
          </AnimatePresence>
          <span className="text-[9px] text-zinc-600">BPM</span>
        </div>

        {/* Accuracy — compact inline */}
        <div className="flex-1 flex flex-col items-center py-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Accuracy</span>
          <span className={`text-2xl font-bold tabular-nums leading-none ${
            rhythm.accuracyScore >= 80 ? "text-emerald-400" :
            rhythm.accuracyScore >= 50 ? "text-yellow-400" : "text-red-400"
          }`}>
            {rhythm.hasData ? `${rhythm.accuracyScore}` : "—"}
          </span>
          <span className="text-[9px] text-zinc-600">{rhythm.hasData ? "%" : ""}</span>
        </div>
      </div>

      {/* ── Status badge ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={rhythm.status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center justify-center py-1.5 rounded-lg ${bg} border border-white/5`}
        >
          <span className={`text-xs font-semibold ${color}`}>{label}</span>
        </motion.div>
      </AnimatePresence>

      {/* ── Rhythm meter ── */}
      <RhythmMeter position={rhythm.meterPosition} hasData={rhythm.hasData} />

      {/* ── Bottom row: voice + metrics ── */}
      <div className="flex items-center gap-2">
        {/* Voice bar */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[9px] font-medium uppercase tracking-widest ${isSpeaking ? "text-emerald-400" : "text-zinc-600"}`}>
            {isSpeaking ? "●" : "○"}
          </span>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isSpeaking ? "bg-emerald-400" : "bg-zinc-600"}`}
              animate={{ width: isListening ? `${Math.min(volume * 600, 100)}%` : "0%" }}
              transition={{ duration: 0.04 }}
            />
          </div>
        </div>

        {/* Metrics pills */}
        <div className="flex gap-1.5 flex-1 justify-end">
          <MiniPill label="Streak" value={metrics.beatStreak > 0 ? `${metrics.beatStreak}` : "—"} />
          <MiniPill label="Consist." value={metrics.rhythmConsistency > 0 ? `${metrics.rhythmConsistency}%` : "—"} />
          <MiniPill label="Avg" value={metrics.averageBpm > 0 ? `${Math.round(metrics.averageBpm)}` : "—"} />
        </div>
      </div>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800 min-w-[44px]">
      <span className="text-[8px] text-zinc-600 uppercase tracking-wider leading-none">{label}</span>
      <span className="text-xs font-bold text-zinc-300 tabular-nums leading-tight">{value}</span>
    </div>
  );
}
