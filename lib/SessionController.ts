/**
 * SessionController
 *
 * Orchestrates a full coaching session:
 *  - Owns the session lifecycle (start / stop)
 *  - Accumulates a history of RhythmAnalysis snapshots
 *  - Calls MetricsCalculator on every update
 *  - Exposes the final SessionSummaryData when a session ends
 *
 * This class is deliberately free of React — it is consumed by the
 * useSessionMetrics hook which bridges it to component state.
 */

import { computeSessionMetrics, deriveCoachingMessage } from "./MetricsCalculator";
import type {
  RhythmAnalysis,
  SessionMetrics,
  CoachingMessage,
  SessionSummaryData,
  SpeechBurst,
} from "@/types";

export type MetricsCallback = (
  metrics: SessionMetrics,
  coaching: CoachingMessage
) => void;

export class SessionController {
  private _isRunning = false;
  private startTime = 0;
  private snapshots: RhythmAnalysis[] = [];
  private metricsCallbacks: MetricsCallback[] = [];
  private lastBurstTime = 0;

  get isRunning(): boolean {
    return this._isRunning;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  start(): void {
    this._isRunning = true;
    this.startTime = performance.now();
    this.snapshots = [];
    this.lastBurstTime = performance.now();
  }

  /**
   * Stop the session and return a summary snapshot.
   * Returns null if the session never had data.
   */
  stop(): SessionSummaryData | null {
    if (!this._isRunning) return null;
    this._isRunning = false;

    const durationSeconds = (performance.now() - this.startTime) / 1000;
    const metrics = computeSessionMetrics(this.snapshots, [], durationSeconds);

    if (metrics.averageBpm === -1) return null;

    return {
      durationSeconds,
      targetBpm: this.snapshots[0]?.targetBpm ?? 82,
      averageBpm: metrics.averageBpm,
      averageAccuracy: metrics.averageAccuracy,
      fastDeviations: metrics.fastDeviations,
      slowDeviations: metrics.slowDeviations,
      longestBeatStreak: metrics.longestBeatStreak,
      rhythmConsistency: metrics.rhythmConsistency,
    };
  }

  // ── Feed data ──────────────────────────────────────────────────────────

  /**
   * Called by useSessionMetrics whenever a new RhythmAnalysis arrives.
   * Stores the snapshot, recomputes metrics, and notifies subscribers.
   */
  update(rhythm: RhythmAnalysis, bursts: SpeechBurst[]): void {
    if (!this._isRunning) return;

    // Record last burst time for silence-gap detection
    const lastCompletedBurst = [...bursts]
      .reverse()
      .find((b) => b.endTime !== null);
    if (lastCompletedBurst) {
      this.lastBurstTime = lastCompletedBurst.endTime!;
    }

    const lastBurstGapMs = performance.now() - this.lastBurstTime;

    if (rhythm.hasData) {
      this.snapshots.push(rhythm);
    }

    const durationSeconds = (performance.now() - this.startTime) / 1000;
    const metrics = computeSessionMetrics(this.snapshots, bursts, durationSeconds);
    const coaching = deriveCoachingMessage(rhythm, metrics, lastBurstGapMs);

    this.metricsCallbacks.forEach((cb) => cb(metrics, coaching));
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  onMetrics(cb: MetricsCallback): () => void {
    this.metricsCallbacks.push(cb);
    return () => {
      this.metricsCallbacks = this.metricsCallbacks.filter((f) => f !== cb);
    };
  }
}
