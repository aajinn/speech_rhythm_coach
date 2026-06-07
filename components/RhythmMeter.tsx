"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface RhythmMeterProps {
  /**
   * -1.0 = maximally slow, 0.0 = perfect, +1.0 = maximally fast.
   * The indicator animates with a spring so it glides in real time.
   */
  position: number;
  hasData: boolean;
}

export default function RhythmMeter({ position, hasData }: RhythmMeterProps) {
  // Spring-damped motion value
  const springPos = useSpring(0, { stiffness: 80, damping: 20, mass: 0.6 });

  useEffect(() => {
    springPos.set(position);
  }, [position, springPos]);

  // Map −1…+1 → 2%…98% of track width
  const leftPct = useTransform(springPos, [-1, 1], [2, 98]);

  // Convert to CSS percentage string (hoisted — no hook inside JSX)
  const leftCss = useTransform(leftPct, (v) => `${v}%`);

  // Dot colour interpolation: blue → green → orange
  const dotColor = useTransform(
    springPos,
    [-1, -0.15, 0.15, 1],
    ["#60a5fa", "#34d399", "#34d399", "#fb923c"]
  );

  const dotShadow = useTransform(springPos, [-1, -0.15, 0.15, 1], [
    "0 0 10px 3px rgba(96,165,250,0.55)",
    "0 0 10px 3px rgba(52,211,153,0.55)",
    "0 0 10px 3px rgba(52,211,153,0.55)",
    "0 0 10px 3px rgba(251,146,60,0.55)",
  ]);

  return (
    <div
      className="w-full flex flex-col gap-2 select-none"
      aria-label="Rhythm speed meter"
      role="meter"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={position}
    >
      {/* Labels */}
      <div className="flex justify-between text-[10px] font-semibold tracking-widest uppercase">
        <span className="text-blue-400">Slow</span>
        <span className="text-emerald-400">Perfect</span>
        <span className="text-orange-400">Fast</span>
      </div>

      {/* Track */}
      <div className="relative h-3 rounded-full bg-zinc-800">
        {/* Gradient fill */}
        <div
          className="absolute inset-0 rounded-full opacity-25 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, #60a5fa 0%, #34d399 50%, #fb923c 100%)",
          }}
        />

        {/* Perfect-zone highlight (centre 30%) */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-emerald-500/15 pointer-events-none"
          style={{ left: "35%", width: "30%" }}
        />

        {/* Centre tick */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-emerald-500/40 pointer-events-none" />

        {/* Spring-animated indicator dot */}
        <motion.div
          className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-zinc-900"
          style={{
            left: leftCss,
            translateX: "-50%",
            translateY: "-50%",
            backgroundColor: dotColor,
            boxShadow: dotShadow,
            opacity: hasData ? 1 : 0.3,
          }}
        />
      </div>

      {/* Minor tick marks */}
      <div className="relative h-1.5">
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <div
            key={v}
            className="absolute top-0 bottom-0 w-px bg-zinc-600"
            style={{ left: `${((v + 1) / 2) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
