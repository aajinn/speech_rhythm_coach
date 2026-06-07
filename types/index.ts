export type SessionStatus = "idle" | "running" | "stopped";

export interface MetronomeState {
  isRunning: boolean;
  isMuted: boolean;
  bpm: number;
  beat: number; // increments on every beat tick
}

export interface SessionState {
  status: SessionStatus;
  elapsedSeconds: number;
}

export interface MicrophoneState {
  available: boolean | null; // null = not yet checked
  active: boolean;
  error: string | null;
}

// ── Speech tracking ────────────────────────────────────────────────────────

/** A single detected speech burst (word/syllable onset) */
export interface SpeechBurst {
  /** wall-clock timestamp when voice onset was detected (performance.now() ms) */
  startTime: number;
  /** wall-clock timestamp when silence was detected after this burst */
  endTime: number | null;
  /** duration of this burst in ms (null while still speaking) */
  duration: number | null;
}

export type RhythmStatus = "TOO_SLOW" | "PERFECT" | "TOO_FAST" | "WAITING";

export interface RhythmAnalysis {
  /** Measured BPM from recent speech onsets (-1 while not enough data) */
  currentBpm: number;
  /** Target BPM to match */
  targetBpm: number;
  /** Qualitative judgement */
  status: RhythmStatus;
  /**
   * 0–100 accuracy score.
   * 100 = bursts land exactly on the beat grid.
   * 0   = maximally misaligned or data unavailable.
   */
  accuracyScore: number;
  /**
   * Normalised position on the slow↔fast meter.
   * -1.0 = maximally slow, 0.0 = perfect, +1.0 = maximally fast.
   */
  meterPosition: number;
  /** Whether we have enough data to show a meaningful reading */
  hasData: boolean;
}

export interface SpeechTrackerState {
  isListening: boolean;
  isSpeaking: boolean;
  micError: string | null;
  /** Current raw RMS level 0–1 */
  volume: number;
  /** Completed + in-progress bursts for this session */
  bursts: SpeechBurst[];
  rhythm: RhythmAnalysis;
}

// ── Session metrics & coaching ─────────────────────────────────────────────

export interface SessionMetrics {
  /** Wall-clock session duration in seconds */
  durationSeconds: number;
  /** Mean BPM across all measurements (-1 if no data) */
  averageBpm: number;
  /** Mean accuracy score 0–100 */
  averageAccuracy: number;
  /** Number of measurements where status was TOO_FAST */
  fastDeviations: number;
  /** Number of measurements where status was TOO_SLOW */
  slowDeviations: number;
  /** Current consecutive "PERFECT" beat streak */
  beatStreak: number;
  /** Longest consecutive "PERFECT" beat streak this session */
  longestBeatStreak: number;
  /** Std-dev of BPM readings, inverted to 0–100 consistency score */
  rhythmConsistency: number;
}

export type CoachingLevel =
  | "EXCELLENT"
  | "GOOD"
  | "CORRECT_FAST"
  | "CORRECT_SLOW"
  | "TOO_FAST"
  | "TOO_SLOW"
  | "HOLD_PAUSES"
  | "WAITING";

export interface CoachingMessage {
  level: CoachingLevel;
  headline: string;
  detail: string;
}

export interface SessionSummaryData {
  durationSeconds: number;
  targetBpm: number;
  averageBpm: number;
  averageAccuracy: number;
  fastDeviations: number;
  slowDeviations: number;
  longestBeatStreak: number;
  rhythmConsistency: number;
}

// ── Leaderboard ────────────────────────────────────────────────────────────

/**
 * Skill tier derived from the competence score.
 * Novice → Apprentice → Practitioner → Expert → Master
 */
export type SkillTier =
  | "Novice"
  | "Apprentice"
  | "Practitioner"
  | "Expert"
  | "Master";

/** One leaderboard entry — stores the player's personal best */
export interface LeaderboardEntry {
  /** Unique stable ID (generated once per player name) */
  id: string;
  /** Display name chosen by the user */
  name: string;
  /** Composite competence score 0–100 */
  competenceScore: number;
  /** Derived skill tier */
  tier: SkillTier;
  /** The session data that produced this score */
  bestSession: SessionSummaryData;
  /** ISO timestamp of when this best was achieved */
  achievedAt: string;
  /** Total number of sessions this player has completed */
  totalSessions: number;
  /** True for AI-simulated speakers */
  isBot?: boolean;
}
