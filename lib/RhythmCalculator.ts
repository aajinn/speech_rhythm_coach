/**
 * RhythmCalculator
 *
 * Pure function layer — no state, no side effects.
 *
 * Given an array of SpeechBurst records and a target BPM, it computes:
 *
 *  currentBpm       — inter-onset interval (IOI) converted to BPM using a
 *                     weighted moving average over recent onsets
 *  status           — TOO_SLOW / PERFECT / TOO_FAST / WAITING
 *  accuracyScore    — 0–100 based on how closely onsets align to the beat grid
 *  meterPosition    — −1.0 … +1.0 for the slow↔fast slider
 *
 * Algorithm notes:
 *  - We use speech-onset timestamps (burst.startTime) rather than offsets so
 *    the measurement is independent of how long the user holds each word.
 *  - A minimum of MIN_BURSTS onsets is required before we report data.
 *  - We take the last MAX_WINDOW_BURSTS onsets to stay responsive.
 *  - Accuracy is computed as the mean phase-distance between each onset and
 *    the nearest beat in the 82-BPM grid (0 = exactly on-beat, 0.5 = maximally
 *    off-beat), then converted to a 0–100 score.
 */

import type { SpeechBurst, RhythmAnalysis, RhythmStatus } from "@/types";

const MIN_BURSTS = 3;
const MAX_WINDOW_BURSTS = 12;

/** BPM deviation within which we call it "perfect" */
const PERFECT_TOLERANCE_BPM = 6;
/** BPM deviation at which the meter is pegged to ±1.0 */
const MAX_DEVIATION_BPM = 30;

export function calculateRhythm(
  bursts: SpeechBurst[],
  targetBpm: number
): RhythmAnalysis {
  // Collect completed burst onset times (startTime only)
  const onsets = bursts
    .filter((b) => b.endTime !== null) // completed bursts only
    .map((b) => b.startTime)
    .slice(-MAX_WINDOW_BURSTS);

  if (onsets.length < MIN_BURSTS) {
    return {
      currentBpm: -1,
      targetBpm,
      status: "WAITING",
      accuracyScore: 0,
      meterPosition: 0,
      hasData: false,
    };
  }

  // ── 1. Inter-onset intervals (IOI) ──────────────────────────────────────
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Weighted average — more recent intervals carry more weight
  const currentBpm = weightedIoiToBpm(intervals);

  // ── 2. Status ────────────────────────────────────────────────────────────
  const bpmDelta = currentBpm - targetBpm;
  let status: RhythmStatus;
  if (Math.abs(bpmDelta) <= PERFECT_TOLERANCE_BPM) {
    status = "PERFECT";
  } else if (bpmDelta > 0) {
    status = "TOO_FAST";
  } else {
    status = "TOO_SLOW";
  }

  // ── 3. Meter position (−1 … +1) ─────────────────────────────────────────
  const meterPosition = clamp(bpmDelta / MAX_DEVIATION_BPM, -1, 1);

  // ── 4. Accuracy score (0–100) ────────────────────────────────────────────
  const accuracyScore = computeAccuracyScore(onsets, targetBpm);

  return {
    currentBpm,
    targetBpm,
    status,
    accuracyScore,
    meterPosition,
    hasData: true,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an array of IOIs (ms) to a BPM using an exponential weighted average
 * so that the most recent interval has the most influence.
 */
function weightedIoiToBpm(intervals: number[]): number {
  const alpha = 0.65; // weight decay per step back
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = intervals.length - 1; i >= 0; i--) {
    const age = intervals.length - 1 - i; // 0 = most recent
    const weight = Math.pow(1 - alpha, age);
    weightedSum += intervals[i] * weight;
    weightTotal += weight;
  }

  const avgIntervalMs = weightedSum / weightTotal;
  // Clamp to a sane range before converting (20–300 BPM)
  const clampedMs = clamp(avgIntervalMs, 200, 3000);
  return 60_000 / clampedMs;
}

/**
 * Accuracy score: how well the speech onsets align to the target BPM beat grid.
 *
 * For each onset we compute the phase within the beat period (0–1), where
 * 0 and 1 both mean exactly on the beat. The "phase error" is min(phase, 1-phase)
 * which ranges from 0 (perfect) to 0.5 (worst). We average these and convert
 * to a 0–100 score.
 */
function computeAccuracyScore(
  onsets: number[],
  targetBpm: number
): number {
  if (onsets.length < 2) return 0;

  const beatPeriodMs = 60_000 / targetBpm;
  // Anchor the grid to the first onset
  const anchor = onsets[0];

  let totalError = 0;
  // Skip the first onset (it's the anchor itself)
  for (let i = 1; i < onsets.length; i++) {
    const offset = onsets[i] - anchor;
    const phase = ((offset % beatPeriodMs) + beatPeriodMs) % beatPeriodMs / beatPeriodMs;
    const phaseError = Math.min(phase, 1 - phase); // 0 = on-beat, 0.5 = worst
    totalError += phaseError;
  }

  const meanError = totalError / (onsets.length - 1); // 0 … 0.5
  return Math.round((1 - meanError * 2) * 100); // 100 = perfect, 0 = worst
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
