/**
 * CompetenceScorer
 *
 * Converts a completed SessionSummaryData into a single 0–100 competence
 * score, then maps it to a named skill tier.
 *
 * ── Scoring formula ─────────────────────────────────────────────────────
 *
 *  competence = (accuracy   × 0.40)   -- how closely onsets hit the beat grid
 *             + (consistency × 0.30)  -- BPM standard deviation (inverted)
 *             + (streakBonus × 0.20)  -- longest PERFECT streak relative to session
 *             + (durationBonus × 0.10)-- encourages longer practice sessions
 *
 * Each component is normalised to 0–100 before weighting so they are
 * comparable regardless of session length.
 *
 * ── BPM accuracy penalty ────────────────────────────────────────────────
 *
 * A separate multiplier (0.6–1.0) penalises large average BPM deviation from
 * the target.  Even with a perfect beat-grid alignment, speaking at the wrong
 * average tempo should reduce the score:
 *
 *   bpmPenalty = max(0.6, 1 − |avgBpm − targetBpm| / 50)
 *
 * ── Tiers ───────────────────────────────────────────────────────────────
 *
 *  0 – 19   Novice
 *  20 – 39  Apprentice
 *  40 – 59  Practitioner
 *  60 – 79  Expert
 *  80 – 100 Master
 */

import type { SessionSummaryData, SkillTier } from "@/types";

// Weights must sum to 1.0
const W_ACCURACY     = 0.40;
const W_CONSISTENCY  = 0.30;
const W_STREAK       = 0.20;
const W_DURATION     = 0.10;

/** Minimum session length (s) to get the full duration bonus */
const FULL_DURATION_S = 60;

export interface CompetenceResult {
  /** Final composite score 0–100 (integer) */
  score: number;
  /** Skill tier label */
  tier: SkillTier;
  /** Breakdown for transparency */
  breakdown: {
    accuracyComponent: number;
    consistencyComponent: number;
    streakComponent: number;
    durationComponent: number;
    bpmPenaltyMultiplier: number;
  };
}

export function computeCompetence(s: SessionSummaryData): CompetenceResult {
  // ── 1. Component scores (each 0–100) ──────────────────────────────────

  // Accuracy: direct from session (already 0–100)
  const accuracyComponent = clamp(s.averageAccuracy, 0, 100);

  // Consistency: direct from session (already 0–100)
  const consistencyComponent = clamp(s.rhythmConsistency, 0, 100);

  // Streak bonus: longest streak / expected_streaks_in_session × 100
  // Expected streaks = session_beats / 2 (rough estimate — half the beats
  // spoken consecutively is excellent). Cap at 100.
  const sessionBeats = Math.max(1, (s.durationSeconds / 60) * s.targetBpm);
  const streakComponent = clamp((s.longestBeatStreak / (sessionBeats * 0.5)) * 100, 0, 100);

  // Duration bonus: linear ramp up to FULL_DURATION_S, then flat 100
  const durationComponent = clamp((s.durationSeconds / FULL_DURATION_S) * 100, 0, 100);

  // ── 2. BPM accuracy penalty ───────────────────────────────────────────
  const bpmDelta = Math.abs((s.averageBpm > 0 ? s.averageBpm : s.targetBpm) - s.targetBpm);
  const bpmPenaltyMultiplier = clamp(1 - bpmDelta / 50, 0.6, 1.0);

  // ── 3. Weighted composite ─────────────────────────────────────────────
  const raw =
    accuracyComponent    * W_ACCURACY    +
    consistencyComponent * W_CONSISTENCY +
    streakComponent      * W_STREAK      +
    durationComponent    * W_DURATION;

  const score = Math.round(clamp(raw * bpmPenaltyMultiplier, 0, 100));

  return {
    score,
    tier: scoreToTier(score),
    breakdown: {
      accuracyComponent,
      consistencyComponent,
      streakComponent,
      durationComponent,
      bpmPenaltyMultiplier,
    },
  };
}

export function scoreToTier(score: number): SkillTier {
  if (score >= 80) return "Master";
  if (score >= 60) return "Expert";
  if (score >= 40) return "Practitioner";
  if (score >= 20) return "Apprentice";
  return "Novice";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
