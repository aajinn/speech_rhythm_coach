"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type MicStatus = "checking" | "available" | "denied" | "unavailable";

export default function MicrophoneStatus() {
  const [status, setStatus] = useState<MicStatus>("checking");

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    // Query current permission without prompting
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          setStatus("available");
        } else if (result.state === "denied") {
          setStatus("denied");
        } else {
          // 'prompt' — microphone available but not yet granted
          setStatus("available");
        }

        result.onchange = () => {
          if (result.state === "granted") setStatus("available");
          else if (result.state === "denied") setStatus("denied");
        };
      })
      .catch(() => {
        // permissions API not supported; assume available
        setStatus("available");
      });
  }, []);

  const config: Record<
    MicStatus,
    { label: string; dot: string; text: string }
  > = {
    checking: {
      label: "Checking mic…",
      dot: "bg-zinc-500 animate-pulse",
      text: "text-zinc-500",
    },
    available: {
      label: "Microphone Ready",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
    },
    denied: {
      label: "Microphone Blocked",
      dot: "bg-red-500",
      text: "text-red-400",
    },
    unavailable: {
      label: "No Microphone",
      dot: "bg-zinc-600",
      text: "text-zinc-500",
    },
  };

  const { label, dot, text } = config[status];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className={`text-xs font-medium ${text}`}>{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
