"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MetronomeEngine } from "@/lib/MetronomeEngine";
import type { MetronomeState } from "@/types";

const DEFAULT_BPM = 82;

export function useMetronome(bpm = DEFAULT_BPM) {
  const engineRef = useRef<MetronomeEngine | null>(null);

  const [state, setState] = useState<MetronomeState>({
    isRunning: false,
    isMuted: false,
    bpm,
    beat: 0,
  });

  // Lazily create the engine once (client-only)
  function getEngine(): MetronomeEngine {
    if (!engineRef.current) {
      engineRef.current = new MetronomeEngine(bpm);
    }
    return engineRef.current;
  }

  // Register beat callback to drive the visual pulse counter
  useEffect(() => {
    const engine = getEngine();
    const unsubscribe = engine.onBeat(() => {
      setState((prev) => ({ ...prev, beat: prev.beat + 1 }));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const engine = getEngine();
    engine.start();
    setState((prev) => ({ ...prev, isRunning: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const toggleMute = useCallback(() => {
    const engine = getEngine();
    const next = !engine.muted;
    engine.setMuted(next);
    setState((prev) => ({ ...prev, isMuted: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, start, stop, toggleMute };
}
