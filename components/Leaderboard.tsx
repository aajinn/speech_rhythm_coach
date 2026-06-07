"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LeaderboardEntry, SkillTier } from "@/types";

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  playerName: string;
}

// ── Tier config ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  SkillTier,
  { color: string; bg: string; border: string; emoji: string }
> = {
  Master:       { color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/40",   emoji: "👑" },
  Expert:       { color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/40",  emoji: "⚡" },
  Practitioner: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", emoji: "🎯" },
  Apprentice:   { color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     emoji: "📈" },
  Novice:       { color: "text-zinc-400",    bg: "bg-zinc-800/50",    border: "border-zinc-700",       emoji: "🌱" },
};

// Top-3 medal colours
const RANK_MEDAL = ["🥇", "🥈", "🥉"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, tier }: { score: number; tier: SkillTier }) {
  const { color } = TIER_CONFIG[tier];
  const barColor =
    tier === "Master"       ? "#fcd34d" :
    tier === "Expert"       ? "#a78bfa" :
    tier === "Practitioner" ? "#34d399" :
    tier === "Apprentice"   ? "#38bdf8" : "#71717a";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-8 text-right ${color}`}>
        {score}
      </span>
    </div>
  );
}

// ── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  rank,
  isMe,
  index,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
  index: number;
}) {
  const tier = TIER_CONFIG[entry.tier];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={[
        "rounded-xl border px-3 py-2.5 flex flex-col gap-1.5",
        tier.bg,
        isMe ? `${tier.border} ring-1 ring-inset ${tier.border}` : "border-zinc-800/80",
      ].join(" ")}
    >
      {/* Top row: rank · name · tier badge */}
      <div className="flex items-center gap-2">
        {/* Rank / medal */}
        <span className="text-sm w-6 text-center flex-shrink-0">
          {rank <= 3 ? RANK_MEDAL[rank - 1] : <span className="text-zinc-500 text-xs font-mono">#{rank}</span>}
        </span>

        {/* Name */}
        <span className={`flex-1 text-sm font-semibold truncate ${isMe ? tier.color : "text-zinc-200"}`}>
          {entry.name}
          {isMe && <span className="ml-1.5 text-[9px] font-normal opacity-60">(you)</span>}
          {entry.isBot && !isMe && <span className="ml-1.5 text-[9px] font-normal text-zinc-600">AI</span>}
        </span>

        {/* Tier badge */}
        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${tier.bg} ${tier.color} ${tier.border}`}>
          {tier.emoji} {entry.tier}
        </span>
      </div>

      {/* Score bar */}
      <ScoreBar score={entry.competenceScore} tier={entry.tier} />

      {/* Meta row */}
      <div className="flex items-center justify-between text-[9px] text-zinc-500">
        <span>{entry.totalSessions} session{entry.totalSessions !== 1 ? "s" : ""}</span>
        <span>Best on {formatDate(entry.achievedAt)}</span>
      </div>
    </motion.div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function Leaderboard({
  isOpen,
  onClose,
  entries,
  playerName,
}: LeaderboardProps) {
  const isEmpty = entries.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lb-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Side panel — slides in from the right */}
          <motion.aside
            key="lb-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Leaderboard"
            className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[90vw] flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🏆</span>
                <h2 className="text-base font-bold text-zinc-100">Leaderboard</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close leaderboard"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tier legend */}
            <div className="flex gap-1.5 flex-wrap px-4 py-2.5 border-b border-zinc-800/60 flex-shrink-0">
              {(["Master", "Expert", "Practitioner", "Apprentice", "Novice"] as SkillTier[]).map((t) => {
                const cfg = TIER_CONFIG[t];
                return (
                  <span
                    key={t}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                  >
                    {cfg.emoji} {t}
                  </span>
                );
              })}
            </div>

            {/* Entries list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {isEmpty ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-3 text-center px-6"
                >
                  <span className="text-4xl">🎤</span>
                  <p className="text-sm text-zinc-400 font-medium">No scores yet</p>
                  <p className="text-xs text-zinc-600">
                    Complete a session and save your score to appear here.
                  </p>
                </motion.div>
              ) : (
                entries.map((entry, i) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    isMe={entry.name.toLowerCase() === playerName.toLowerCase()}
                    index={i}
                  />
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
              <p className="text-[9px] text-zinc-600 text-center">
                Personal bests only · AI speakers marked as <span className="text-zinc-500">AI</span>
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
