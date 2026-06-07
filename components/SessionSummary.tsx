"use client";

import { AnimatePresence, motion } from "framer-motion";
import { computeCompetence } from "@/lib/CompetenceScorer";
import type { SessionSummaryData, SkillTier } from "@/types";

interface SessionSummaryProps {
  summary: SessionSummaryData | null;
  isOpen: boolean;
  onDismiss: () => void;
  onSaveToLeaderboard: (session: SessionSummaryData) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const TIER_COLOR: Record<SkillTier, string> = {
  Master:       "text-amber-300",
  Expert:       "text-violet-400",
  Practitioner: "text-emerald-400",
  Apprentice:   "text-sky-400",
  Novice:       "text-zinc-400",
};

const TIER_EMOJI: Record<SkillTier, string> = {
  Master: "👑", Expert: "⚡", Practitioner: "🎯", Apprentice: "📈", Novice: "🌱",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatRow({
  label, value, color,
}: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
      <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color ?? "text-zinc-200"}`}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessionSummary({
  summary, isOpen, onDismiss, onSaveToLeaderboard,
}: SessionSummaryProps) {
  if (!summary) return null;

  const { score, tier } = computeCompetence(summary);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ss-backdrop"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onDismiss}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="ss-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Session Summary"
            className="fixed inset-x-4 top-1/2 z-50 max-w-sm mx-auto"
            initial={{ opacity: 0, scale: 0.93, y: "-46%" }}
            animate={{ opacity: 1, scale: 1,    y: "-50%" }}
            exit={{ opacity: 0, scale: 0.93,    y: "-46%" }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">

              {/* ── Header: competence score ── */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-zinc-100 leading-tight">Session Complete</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Here's how your session went</p>
                </div>

                {/* Score ring */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <motion.span
                    className={`text-3xl font-black tabular-nums ${TIER_COLOR[tier]}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
                  >
                    {score}
                  </motion.span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${TIER_COLOR[tier]}`}>
                    {TIER_EMOJI[tier]} {tier}
                  </span>
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="px-5 py-0.5">
                <StatRow label="Duration" value={formatDuration(summary.durationSeconds)} />
                <StatRow label="Target BPM" value={`${summary.targetBpm}`} color="text-violet-400" />
                <StatRow
                  label="Average BPM"
                  value={summary.averageBpm > 0 ? Math.round(summary.averageBpm).toString() : "—"}
                  color={Math.abs(summary.averageBpm - summary.targetBpm) <= 6 ? "text-emerald-400" : "text-zinc-200"}
                />
                <StatRow
                  label="Accuracy"
                  value={`${summary.averageAccuracy}%`}
                  color={summary.averageAccuracy >= 75 ? "text-emerald-400" : summary.averageAccuracy >= 50 ? "text-yellow-400" : "text-orange-400"}
                />
                <StatRow
                  label="Fast / Slow deviations"
                  value={`${summary.fastDeviations} / ${summary.slowDeviations}`}
                />
                <StatRow
                  label="Longest streak"
                  value={summary.longestBeatStreak > 0 ? `${summary.longestBeatStreak} beats` : "—"}
                  color="text-violet-400"
                />
                <StatRow
                  label="Consistency"
                  value={`${summary.rhythmConsistency}%`}
                  color={summary.rhythmConsistency >= 75 ? "text-emerald-400" : summary.rhythmConsistency >= 50 ? "text-yellow-400" : "text-orange-400"}
                />
              </div>

              {/* ── Accuracy bar ── */}
              <div className="px-5 pt-1 pb-2">
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: summary.averageAccuracy >= 75 ? "#34d399" : summary.averageAccuracy >= 50 ? "#facc15" : "#fb923c" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${summary.averageAccuracy}%` }}
                    transition={{ delay: 0.3, duration: 0.65, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="px-5 py-4 border-t border-zinc-800 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSaveToLeaderboard(summary)}
                  className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5"
                >
                  🏆 Save Score
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onDismiss}
                  className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-medium text-xs transition-colors"
                >
                  New Session
                </motion.button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
