"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechTracker } from "@/lib/SpeechTracker";
import { calculateRhythm } from "@/lib/RhythmCalculator";
import type { SpeechTrackerState, SpeechBurst, RhythmAnalysis } from "@/types";

const TARGET_BPM = 82;

const DEFAULT_RHYTHM: RhythmAnalysis = {
  currentBpm: -1,
  targetBpm: TARGET_BPM,
  status: "WAITING",
  accuracyScore: 0,
  meterPosition: 0,
  hasData: false,
};

const INITIAL_STATE: SpeechTrackerState = {
  isListening: false,
  isSpeaking: false,
  micError: null,
  volume: 0,
  bursts: [],
  rhythm: DEFAULT_RHYTHM,
};

export function useSpeechTracker() {
  const trackerRef = useRef<SpeechTracker | null>(null);
  const [state, setState] = useState<SpeechTrackerState>(INITIAL_STATE);

  function getTracker(): SpeechTracker {
    if (!trackerRef.current) {
      trackerRef.current = new SpeechTracker();
    }
    return trackerRef.current;
  }

  // Subscribe to tracker events once on mount
  useEffect(() => {
    const tracker = getTracker();

    const unsubBursts = tracker.onBursts((bursts: SpeechBurst[]) => {
      const rhythm = calculateRhythm(bursts, TARGET_BPM);
      setState((prev) => ({ ...prev, bursts, rhythm }));
    });

    const unsubSpeaking = tracker.onSpeaking((isSpeaking: boolean) => {
      setState((prev) => ({ ...prev, isSpeaking }));
    });

    const unsubVolume = tracker.onVolume((volume: number) => {
      setState((prev) => ({ ...prev, volume }));
    });

    const unsubError = tracker.onError((micError: string) => {
      setState((prev) => ({ ...prev, micError, isListening: false }));
    });

    return () => {
      unsubBursts();
      unsubSpeaking();
      unsubVolume();
      unsubError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      trackerRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(async () => {
    const tracker = getTracker();
    tracker.reset();
    await tracker.start();
    setState((prev) => ({
      ...prev,
      isListening: tracker.isListening,
      micError: null,
      bursts: [],
      rhythm: DEFAULT_RHYTHM,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    trackerRef.current?.stop();
    setState((prev) => ({
      ...prev,
      isListening: false,
      isSpeaking: false,
      volume: 0,
    }));
  }, []);

  return { state, startListening, stopListening };
}
