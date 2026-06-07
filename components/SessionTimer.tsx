"use client";

import { useEffect, useRef, useState } from "react";

interface SessionTimerProps {
  isRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SessionTimer({ isRunning }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRunningRef = useRef(false);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && !prevRunningRef.current) setElapsed(0);
    prevRunningRef.current = isRunning;
  }, [isRunning]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Time</span>
      <span className="text-xl font-mono font-semibold text-zinc-200 tabular-nums">
        {formatTime(elapsed)}
      </span>
    </div>
  );
}
