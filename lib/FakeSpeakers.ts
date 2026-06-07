/**
 * FakeSpeakers
 *
 * Simulates a pool of AI competitors that use the same CompetenceScorer
 * algorithm as real players.
 *
 * ── Design ──────────────────────────────────────────────────────────────────
 *
 * Each bot has:
 *   name         – display name
 *   baseLine     – the score floor they start at (their "natural" level)
 *   ceiling      – maximum score they can ever reach
 *   growthRate   – how aggressively they improve per user session (0–1)
 *   variance     – session-to-session noise (0–1)
 *
 * Bots are spread across all tiers so the leaderboard always has competition
 * at every level.  Their scores are deterministically seeded from their name
 * so they initialise consistently even after a page reload.
 *
 * ── Trigger logic ────────────────────────────────────────────────────────────
 *
 * `advanceBots(userScore)` is called after the user saves a session.
 * Each bot simulates one "practice session":
 *   newScore = clamp(current + growthStep * (1 + noise), baseLine, ceiling)
 *
 * The growth step accelerates when the bot is trailing the user (they practice
 * harder to catch up) and decelerates when they're comfortably ahead.
 *
 * ── Session synthesis ────────────────────────────────────────────────────────
 *
 * Each bot's score is "unpacked" back into a plausible SessionSummaryData so
 * it goes through computeCompetence() exactly like a real session.
 * This guarantees that displayed tiers and scores are consistent.
 */

import { computeCompetence } from "./CompetenceScorer";
import type { LeaderboardEntry, SessionSummaryData, SkillTier } from "@/types";
import { scoreToTier } from "./CompetenceScorer";

// ── Bot archetypes ─────────────────────────────────────────────────────────

interface BotArchetype {
  name: string;
  /** Starting score (first time they're initialised) */
  baseLine: number;
  /** Hard ceiling — they can never exceed this */
  ceiling: number;
  /** Points gained per user session (base, before noise) */
  growthRate: number;
  /** Random noise amplitude ±variance per session */
  variance: number;
}

const ARCHETYPES: BotArchetype[] = [
  // ── Novices ──
  { name: "Alex M.",      baseLine:  8, ceiling: 25, growthRate: 1.2, variance: 3 },
  { name: "Jamie K.",     baseLine: 12, ceiling: 32, growthRate: 1.4, variance: 4 },
  // ── Apprentices ──
  { name: "Sam R.",       baseLine: 22, ceiling: 48, growthRate: 1.5, variance: 4 },
  { name: "Casey L.",     baseLine: 28, ceiling: 52, growthRate: 1.3, variance: 3 },
  { name: "Morgan T.",    baseLine: 35, ceiling: 55, growthRate: 1.1, variance: 3 },
  // ── Practitioners ──
  { name: "Jordan P.",    baseLine: 43, ceiling: 65, growthRate: 0.9, variance: 2 },
  { name: "Riley H.",     baseLine: 50, ceiling: 68, growthRate: 0.8, variance: 2 },
  { name: "Taylor N.",    baseLine: 56, ceiling: 72, growthRate: 0.7, variance: 2 },
  // ── Experts ──
  { name: "Quinn A.",     baseLine: 63, ceiling: 82, growthRate: 0.6, variance: 2 },
  { name: "Drew C.",      baseLine: 70, ceiling: 85, growthRate: 0.5, variance: 1 },
  // ── Masters ──
  { name: "Skyler V.",    baseLine: 82, ceiling: 95, growthRate: 0.3, variance: 1 },
  { name: "Avery W.",     baseLine: 88, ceiling: 99, growthRate: 0.2, variance: 1 },
];

// ── Seeded RNG (Mulberry32) ────────────────────────────────────────────────
// Used so bot initial scores are deterministic from their name.

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function nameToSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Session synthesis ─────────────────────────────────────────────────────

/**
 * Given a target competence score, synthesise a plausible SessionSummaryData
 * that will produce approximately that score when fed through computeCompetence.
 *
 * We reverse-engineer the components: since the formula is
 *   score ≈ (accuracy×0.4 + consistency×0.3 + streak×0.2 + duration×0.1) × bpmPenalty
 * and we want bpmPenalty ≈ 0.95 (slight imperfection), we back-calculate
 * accuracy from the target, then set consistency / streak proportionally.
 */
function synthesiseSession(targetScore: number, rng: () => number): SessionSummaryData {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // BPM penalty ≈ 0.92–0.98 (small deviation from target)
  const bpmPenalty = 0.92 + rng() * 0.06;
  // Raw composite needed before penalty
  const rawNeeded = clamp(targetScore / bpmPenalty, 0, 100);

  // Distribute across components with natural variation
  const accuracy     = clamp(rawNeeded * (0.85 + rng() * 0.30), 0, 100);
  const consistency  = clamp(rawNeeded * (0.80 + rng() * 0.35), 0, 100);
  const streakFrac   = clamp(rawNeeded * (0.70 + rng() * 0.40), 0, 100);
  const durationFrac = clamp(50 + rng() * 50, 0, 100);          // 50–100

  // Duration: map durationFrac (0–100) → 30–120 s
  const durationSeconds = 30 + (durationFrac / 100) * 90;

  // Streak: reverse the streak formula
  // streakComponent = (longestStreak / (sessionBeats * 0.5)) * 100
  const sessionBeats  = (durationSeconds / 60) * 82;
  const longestStreak = Math.round((streakFrac / 100) * sessionBeats * 0.5);

  // BPM deviation that achieves our penalty
  // penalty = 1 - delta/50  →  delta = (1 - penalty) * 50
  const bpmDelta  = (1 - bpmPenalty) * 50;
  const direction = rng() > 0.5 ? 1 : -1;
  const averageBpm = 82 + direction * bpmDelta;

  // Deviations: inverse of accuracy
  const totalMeasurements = Math.round(durationSeconds / 1.5);
  const deviationFrac = (100 - accuracy) / 100;
  const fastDeviations = Math.round(totalMeasurements * deviationFrac * (0.4 + rng() * 0.2));
  const slowDeviations = Math.round(totalMeasurements * deviationFrac * (0.4 + rng() * 0.2));

  return {
    targetBpm:        82,
    durationSeconds:  Math.round(durationSeconds),
    averageBpm:       Math.round(averageBpm * 10) / 10,
    averageAccuracy:  Math.round(accuracy),
    fastDeviations,
    slowDeviations,
    longestBeatStreak: longestStreak,
    rhythmConsistency: Math.round(consistency),
  };
}

// ── Bot state stored in localStorage ─────────────────────────────────────

const BOT_STATE_KEY = "src_bot_state_v1";

interface BotState {
  [name: string]: {
    currentScore: number;
    totalSessions: number;
    achievedAt: string;
  };
}

function loadBotState(): BotState {
  try {
    const raw = localStorage.getItem(BOT_STATE_KEY);
    return raw ? (JSON.parse(raw) as BotState) : {};
  } catch { return {}; }
}

function saveBotState(state: BotState): void {
  try { localStorage.setItem(BOT_STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialise bots into state if not already present.
 * Call once on app mount.
 */
export function initialiseBots(): void {
  const state = loadBotState();
  let changed = false;

  for (const bot of ARCHETYPES) {
    if (!state[bot.name]) {
      const rng = mulberry32(nameToSeed(bot.name));
      // Initial score: baseLine ± small noise
      const initial = Math.round(
        Math.max(bot.baseLine, bot.baseLine + (rng() - 0.5) * bot.variance * 2)
      );
      state[bot.name] = {
        currentScore: initial,
        totalSessions: Math.floor(rng() * 5) + 1, // 1–5 prior "sessions"
        achievedAt: new Date(Date.now() - Math.floor(rng() * 7 * 86400000)).toISOString(),
      };
      changed = true;
    }
  }

  if (changed) saveBotState(state);
}

/**
 * Advance all bots by one simulated session, using the user's latest score
 * as a competitive pressure signal.
 *
 * Bots trailing the user grow faster; bots well ahead grow slower.
 * Call this every time the user saves a session.
 */
export function advanceBots(userScore: number): void {
  const state = loadBotState();

  for (const bot of ARCHETYPES) {
    const current = state[bot.name]?.currentScore ?? bot.baseLine;

    // Competitive pressure: 1.5× growth when user is above the bot
    const pressure = userScore > current ? 1.5 : 0.8;
    // Seeded noise per session (use timestamp-based seed for true randomness)
    const noiseSeed = nameToSeed(bot.name + Date.now().toString());
    const rng = mulberry32(noiseSeed);
    const noise = (rng() - 0.4) * bot.variance; // slight positive bias

    const newScore = Math.round(
      Math.min(bot.ceiling, Math.max(bot.baseLine, current + bot.growthRate * pressure + noise))
    );

    state[bot.name] = {
      currentScore: newScore,
      totalSessions: (state[bot.name]?.totalSessions ?? 0) + 1,
      // Update achievedAt only if score improved
      achievedAt:
        newScore > current
          ? new Date().toISOString()
          : (state[bot.name]?.achievedAt ?? new Date().toISOString()),
    };
  }

  saveBotState(state);
}

/**
 * Build LeaderboardEntry objects for all bots from their current state.
 * Each bot's SessionSummaryData is synthesised so computeCompetence() produces
 * a score close to their stored currentScore.
 */
export function getBotEntries(): LeaderboardEntry[] {
  const state = loadBotState();

  return ARCHETYPES.map((bot) => {
    const s = state[bot.name];
    const score = s?.currentScore ?? bot.baseLine;
    const rng = mulberry32(nameToSeed(bot.name + score));
    const session = synthesiseSession(score, rng);
    const { score: actualScore, tier } = computeCompetence(session);

    return {
      id:              `bot-${nameToSeed(bot.name).toString(36)}`,
      name:            bot.name,
      competenceScore: actualScore,
      tier:            tier as SkillTier,
      bestSession:     session,
      achievedAt:      s?.achievedAt ?? new Date().toISOString(),
      totalSessions:   s?.totalSessions ?? 1,
      isBot:           true,
    } satisfies LeaderboardEntry;
  });
}

/**
 * Reset all bot state (useful for testing).
 */
export function resetBots(): void {
  try { localStorage.removeItem(BOT_STATE_KEY); } catch { /* ignore */ }
}
