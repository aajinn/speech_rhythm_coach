"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface NamePromptProps {
  isOpen: boolean;
  onConfirm: (name: string) => void;
  onDismiss: () => void;
}

export default function NamePrompt({ isOpen, onConfirm, onDismiss }: NamePromptProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 1) return;
    onConfirm(trimmed);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="name-backdrop"
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            key="name-card"
            role="dialog"
            aria-modal="true"
            aria-label="Enter your name"
            className="fixed inset-x-6 top-1/2 z-50 max-w-xs mx-auto"
            initial={{ opacity: 0, scale: 0.94, y: "-46%" }}
            animate={{ opacity: 1, scale: 1,    y: "-50%" }}
            exit={{ opacity: 0, scale: 0.94,    y: "-46%" }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-3xl" aria-hidden="true">🏆</span>
                <h2 className="text-base font-bold text-zinc-100">
                  Save to Leaderboard
                </h2>
                <p className="text-xs text-zinc-500 leading-snug">
                  Enter a display name to record your score. Your personal best will be kept.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Your name…"
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-11 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                  aria-label="Display name"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    Skip
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={value.trim().length === 0}
                    className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    Save Score
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
