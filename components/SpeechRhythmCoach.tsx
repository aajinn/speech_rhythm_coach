"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMetronome } from "@/hooks/useMetronome";
import { useSpeechTracker } from "@/hooks/useSpeechTracker";
import { useSessionMetrics } from "@/hooks/useSessionMetrics";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import PulseVisualizer from "@/components/PulseVisualizer";
import SessionControls from "@/components/SessionControls";
import SessionTimer from "@/components/SessionTimer";
import RhythmDisplay from "@/components/RhythmDisplay";
import CoachingFeedback from "@/components/CoachingFeedback";
import SessionSummary from "@/components/SessionSummary";
import Leaderboard from "@/components/Leaderboard";
import NamePrompt from "@/components/NamePrompt";

const TARGET_BPM = 82;

export default function SpeechRhythmCoach() {
  // ── Core hooks ─────────────────────────────────────────────────────────
  const { state: metro, start: startMetro, stop: stopMetro, toggleMute } = useMetronome(TARGET_BPM);
  const { state: speech, startListening, stopListening } = useSpeechTracker();
  const {
    metrics, coaching, summary, showSummary,
    startSession, stopSession, feedRhythm, dismissSummary,
  } = useSessionMetrics();
  const {
    entries, playerName, myRank,
    showLeaderboard, showNamePrompt,
    offerSave, confirmName, dismissNamePrompt,
    openLeaderboard, closeLeaderboard,
  } = useLeaderboard();

  // Feed rhythm data into session controller while running
  useEffect(() => {
    if (metro.isRunning) feedRhythm(speech.rhythm, speech.bursts);
  }, [speech.rhythm, speech.bursts, metro.isRunning, feedRhythm]);

  // ── Session handlers ───────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    startSession(); startMetro(); await startListening();
  }, [startSession, startMetro, startListening]);

  const handleStop = useCallback(() => {
    stopMetro(); stopListening(); stopSession();
  }, [stopMetro, stopListening, stopSession]);

  const handleStartStop = useCallback(() => {
    metro.isRunning ? handleStop() : handleStart();
  }, [metro.isRunning, handleStart, handleStop]);

  // When user wants to save after session summary
  const handleSaveToLeaderboard = useCallback((session: typeof summary) => {
    if (!session) return;
    dismissSummary();
    offerSave(session);
  }, [dismissSummary, offerSave]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onStartStop: handleStartStop,
    onToggleMute: toggleMute,
    onDismiss: showSummary ? dismissSummary : closeLeaderboard,
  });

  return (
    <>
      {/* ── Overlays (z-order matters) ── */}
      <NamePrompt
        isOpen={showNamePrompt}
        onConfirm={confirmName}
        onDismiss={dismissNamePrompt}
      />
      <SessionSummary
        summary={summary}
        isOpen={showSummary}
        onDismiss={dismissSummary}
        onSaveToLeaderboard={handleSaveToLeaderboard}
      />
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={closeLeaderboard}
        entries={entries}
        playerName={playerName}
      />

      {/* ── Main layout ── */}
      <div className="min-h-screen bg-zinc-950 text-white overflow-y-auto">
        <div className="flex flex-col items-center px-4 pt-5 pb-6 gap-3 w-full max-w-sm mx-auto">

          {/* ── Header ── */}
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full flex items-start justify-between"
          >
            {/* Title */}
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Speech Rhythm Coach
              </h1>
              <p className="text-xs text-zinc-500">
                Target{" "}
                <span className="text-violet-400 font-semibold">{TARGET_BPM} BPM</span>
                {" "}· one word per beat
              </p>
            </div>

            {/* Leaderboard button */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={openLeaderboard}
              aria-label="Open leaderboard"
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors flex-shrink-0"
            >
              <span className="text-lg leading-none" aria-hidden="true">🏆</span>
              {myRank ? (
                <span className="text-[9px] font-bold text-violet-400">#{myRank}</span>
              ) : (
                <span className="text-[9px] text-zinc-600">Rank</span>
              )}
            </motion.button>
          </motion.header>

          {/* Player name pill (when known) */}
          {playerName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800"
            >
              <span className="text-[9px] text-zinc-500">Playing as</span>
              <span className="text-[9px] font-semibold text-violet-400">{playerName}</span>
            </motion.div>
          )}

          {/* ── Pulse + timer ── */}
          <div className="flex flex-col items-center gap-1.5">
            <PulseVisualizer beat={metro.beat} isRunning={metro.isRunning} bpm={TARGET_BPM} />
            <SessionTimer isRunning={metro.isRunning} />
          </div>

          {/* ── Controls ── */}
          <SessionControls
            isRunning={metro.isRunning}
            isMuted={metro.isMuted}
            onStart={handleStart}
            onStop={handleStop}
            onToggleMute={toggleMute}
          />

          {/* ── Keyboard shortcuts ── */}
          <div className="flex items-center gap-3" aria-label="Keyboard shortcuts">
            <Kbd k="Space" label={metro.isRunning ? "Stop" : "Start"} />
            <Kbd k="M" label="Mute" />
            <Kbd k="Esc" label="Dismiss" />
          </div>

          {/* ── Coaching feedback ── */}
          <CoachingFeedback message={coaching} isActive={metro.isRunning} />

          {/* ── Rhythm panel ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3"
          >
            <RhythmDisplay
              rhythm={speech.rhythm}
              metrics={metrics}
              volume={speech.volume}
              isSpeaking={speech.isSpeaking}
              isListening={speech.isListening}
            />
          </motion.div>

          {/* ── Mic error ── */}
          <AnimatePresence>
            {speech.micError && (
              <motion.div
                key="mic-error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center"
                role="alert"
              >
                {speech.micError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer ── */}
          <p className="text-[10px] text-zinc-700 text-center">
            {metro.isRunning
              ? "Rhythm and coaching update live"
              : "Press Start or Space to begin"}
          </p>

        </div>
      </div>
    </>
  );
}

// ── Kbd badge ─────────────────────────────────────────────────────────────────

function Kbd({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-mono leading-none min-w-[1.4rem]">
        {k}
      </kbd>
      <span className="text-[9px] text-zinc-600">{label}</span>
    </div>
  );
}
