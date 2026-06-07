"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface PulseVisualizerProps {
  beat: number;
  isRunning: boolean;
  bpm: number;
}

export default function PulseVisualizer({ beat, isRunning, bpm }: PulseVisualizerProps) {
  const circleControls = useAnimation();
  const ringControls = useAnimation();
  const prevBeatRef = useRef(0);
  const beatDuration = 60 / bpm;

  useEffect(() => {
    if (!isRunning) {
      circleControls.start({ scale: 1, opacity: 0.35 });
      ringControls.start({ scale: 1, opacity: 0 });
      prevBeatRef.current = beat;
      return;
    }
    if (beat === prevBeatRef.current) return;
    prevBeatRef.current = beat;

    circleControls.start({
      scale: [1, 1.18, 1],
      opacity: [0.35, 1, 0.35],
      transition: { duration: beatDuration * 0.85, ease: "easeInOut", times: [0, 0.25, 1] },
    });
    ringControls.start({
      scale: [1, 1.6],
      opacity: [0.7, 0],
      transition: { duration: beatDuration * 0.7, ease: "easeOut" },
    });
  }, [beat, isRunning, beatDuration, circleControls, ringControls]);

  return (
    /* Responsive: 44vw on small screens, capped at 200px, min 140px */
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: "clamp(140px, 44vw, 200px)", height: "clamp(140px, 44vw, 200px)" }}
    >
      <motion.div
        className="absolute rounded-full bg-violet-500"
        style={{ width: "100%", height: "100%" }}
        animate={ringControls}
        initial={{ scale: 1, opacity: 0 }}
      />
      <div className="absolute rounded-full bg-violet-900/30 w-full h-full" />
      <motion.div
        className="rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 shadow-[0_0_40px_rgba(139,92,246,0.5)]"
        style={{ width: "75%", height: "75%" }}
        animate={circleControls}
        initial={{ scale: 1, opacity: 0.35 }}
      />
      <div className="absolute flex flex-col items-center select-none">
        <span className="text-2xl font-bold text-white tabular-nums leading-none">{bpm}</span>
        <span className="text-[10px] font-medium text-violet-300 tracking-widest uppercase mt-0.5">BPM</span>
      </div>
    </div>
  );
}
