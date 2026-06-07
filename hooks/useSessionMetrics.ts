"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionController } from "@/lib/SessionController";
import type {
  RhythmAnalysis,
  SessionMetrics,
  CoachingMessage,
  SessionSummaryData,
  SpeechBurst,
} from "@/types";

const INITIAL_METRICS: SessionMetrics = {
  durationSeconds: 0,
  averageBpm: -1,
  averageAccuracy: 0,
  fastDeviations: 0,
  slowDeviations: 0,
  beatStreak: 0,
  longestBeatStreak: 0,
  rhythmConsistency: 0,
};

const INITIAL_COACHING: CoachingMessage = {
  level: "WAITING",
  headline: "Ready when you are",
  detail: "Start speaking — one word per beat click",
};

export function useSessionMetrics() {
  const controllerRef = useRef<SessionController | null>(null);

  const [metrics, setMetrics] = useState<SessionMetrics>(INITIAL_METRICS);
  const [coaching, setCoaching] = useState<CoachingMessage>(INITIAL_COACHING);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  function getController(): SessionController {
    if (!controllerRef.current) {
      controllerRef.current = new SessionController();
    }
    return controllerRef.current;
  }

  // Subscribe to controller metrics updates once
  useEffect(() => {
    const ctrl = getController();
    const unsub = ctrl.onMetrics((m, c) => {
      setMetrics(m);
      setCoaching(c);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(() => {
    setSummary(null);
    setShowSummary(false);
    setMetrics(INITIAL_METRICS);
    setCoaching(INITIAL_COACHING);
    getController().start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = useCallback((): SessionSummaryData | null => {
    const result = getController().stop();
    if (result) {
      setSummary(result);
      setShowSummary(true);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Feed a new rhythm snapshot + burst list into the controller */
  const feedRhythm = useCallback(
    (rhythm: RhythmAnalysis, bursts: SpeechBurst[]) => {
      getController().update(rhythm, bursts);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const dismissSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  return {
    metrics,
    coaching,
    summary,
    showSummary,
    startSession,
    stopSession,
    feedRhythm,
    dismissSummary,
  };
}
