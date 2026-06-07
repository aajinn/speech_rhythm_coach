/**
 * MetricsCalculator
 *
 * Pure functions that compute session-level statistics from the running
 * history of rhythm analyses.  No state, no side effects.
 *
 * Called once per burst by SessionController and exposed to the React layer
 * via useSessionMetrics.
 */

import type {
  RhythmAnalysis,
  SessionMetrics,
  CoachingMessage,
  CoachingLevel,
  SpeechBurst,
} from "@/types";

// ── Session metrics ────────────────────────────────────────────────────────

/**
 * Compute aggregated session metrics from the full history of rhythm snapshots
 * and the raw burst list.
 */
export function computeSessionMetrics(
  snapshots: RhythmAnalysis[],
  bursts: SpeechBurst[],
  durationSeconds: number
): SessionMetrics {
  const dataSnaps = snapshots.filter((s) => s.hasData);

  if (dataSnaps.length === 0) {
    return {
      durationSeconds,
      averageBpm: -1,
      averageAccuracy: 0,
      fastDeviations: 0,
      slowDeviations: 0,
      beatStreak: 0,
      longestBeatStreak: 0,
      rhythmConsistency: 0,
    };
  }

  // Average BPM
  const averageBpm =
    dataSnaps.reduce((s, r) => s + r.currentBpm, 0) / dataSnaps.length;

  // Average accuracy
  const averageAccuracy = Math.round(
    dataSnaps.reduce((s, r) => s + r.accuracyScore, 0) / dataSnaps.length
  );

  // Deviations
  const fastDeviations = dataSnaps.filter((r) => r.status === "TOO_FAST").length;
  const slowDeviations = dataSnaps.filter((r) => r.status === "TOO_SLOW").length;

  // Streak tracking — walk through snapshots in order
  let currentStreak = 0;
  let longestBeatStreak = 0;
  for (const snap of dataSnaps) {
    if (snap.status === "PERFECT") {
      currentStreak++;
      if (currentStreak > longestBeatStreak) longestBeatStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Rhythm consistency: inverse of BPM standard deviation, 0–100
  const bpms = dataSnaps.map((r) => r.currentBpm);
  const stdDev = standardDeviation(bpms);
  // A std-dev of 0 = perfect consistency (100), 20 BPM = 0 consistency
  const rhythmConsistency = Math.max(0, Math.round((1 - stdDev / 20) * 100));

  return {
    durationSeconds,
    averageBpm,
    averageAccuracy,
    fastDeviations,
    slowDeviations,
    beatStreak: currentStreak,
    longestBeatStreak,
    rhythmConsistency,
  };
}

// ── Coaching messages ──────────────────────────────────────────────────────

/**
 * Derive the most relevant coaching message from the current rhythm analysis
 * and running session metrics.
 *
 * Priority order (most specific wins):
 *  1. No data yet                         → WAITING
 *  2. Score ≥ 88 and PERFECT status       → EXCELLENT
 *  3. Score ≥ 70 and PERFECT status       → GOOD
 *  4. TOO_FAST by a small margin (< 10)   → CORRECT_FAST
 *  5. TOO_SLOW by a small margin (< 10)   → CORRECT_SLOW
 *  6. TOO_FAST by a larger margin         → TOO_FAST
 *  7. TOO_SLOW by a larger margin         → TOO_SLOW
 *  8. Silence too long (burst gap > 2 s)  → HOLD_PAUSES
 */
export function deriveCoachingMessage(
  rhythm: RhythmAnalysis,
  metrics: SessionMetrics,
  lastBurstGapMs: number
): CoachingMessage {
  if (!rhythm.hasData) {
    return MESSAGES.WAITING;
  }

  const bpmDelta = rhythm.currentBpm - rhythm.targetBpm;
  const absDelta = Math.abs(bpmDelta);

  // Silence too long (user has paused more than 2 s since last burst)
  if (lastBurstGapMs > 2000 && metrics.durationSeconds > 3) {
    return MESSAGES.HOLD_PAUSES;
  }

  if (rhythm.status === "PERFECT") {
    if (rhythm.accuracyScore >= 88) return MESSAGES.EXCELLENT;
    if (rhythm.accuracyScore >= 70) return MESSAGES.GOOD;
    return MESSAGES.CORRECT_SLOW; // default neutral PERFECT
  }

  if (bpmDelta > 0) {
    return absDelta < 10 ? MESSAGES.CORRECT_FAST : MESSAGES.TOO_FAST;
  } else {
    return absDelta < 10 ? MESSAGES.CORRECT_SLOW : MESSAGES.TOO_SLOW;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ── Message library ───────────────────────────────────────────────────────

const MESSAGES: Record<CoachingLevel, CoachingMessage> = {
  WAITING: {
    level: "WAITING",
    headline: "Ready when you are",
    detail: "Start speaking — one word per beat click",
  },
  EXCELLENT: {
    level: "EXCELLENT",
    headline: "Excellent Pace",
    detail: "You're locked in — keep this rhythm going",
  },
  GOOD: {
    level: "GOOD",
    headline: "Great Rhythm",
    detail: "On beat and consistent — nice work",
  },
  CORRECT_FAST: {
    level: "CORRECT_FAST",
    headline: "Ease Back Slightly",
    detail: "Just a touch fast — breathe and slow the pace",
  },
  CORRECT_SLOW: {
    level: "CORRECT_SLOW",
    headline: "Stay With The Beat",
    detail: "Match each word to the click",
  },
  TOO_FAST: {
    level: "TOO_FAST",
    headline: "Slow Down",
    detail: "Way ahead of the beat — let the clicks guide you",
  },
  TOO_SLOW: {
    level: "TOO_SLOW",
    headline: "Speed Up",
    detail: "Behind the beat — pick up the pace to match the click",
  },
  HOLD_PAUSES: {
    level: "HOLD_PAUSES",
    headline: "Keep Speaking",
    detail: "Long pause detected — try to keep a steady flow",
  },
};
