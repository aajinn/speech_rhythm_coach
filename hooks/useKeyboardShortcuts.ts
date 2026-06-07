"use client";

import { useEffect } from "react";

export interface ShortcutHandlers {
  onStartStop: () => void;
  onToggleMute: () => void;
  onDismiss: () => void;
}

/**
 * Global keyboard shortcuts for the session.
 *
 *  Space      → start / stop session (toggle)
 *  M          → mute / unmute metronome click
 *  Escape     → dismiss summary modal
 *
 * Skips when focus is inside an input, textarea, select, or button so browser
 * defaults and interactive controls are never hijacked.
 */
export function useKeyboardShortcuts({
  onStartStop,
  onToggleMute,
  onDismiss,
}: ShortcutHandlers): void {
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      // Don't steal keys from interactive elements
      const tag = (e.target as HTMLElement)?.tagName ?? "";
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;

      switch (e.key) {
        case " ":
          // Space — prevent page scroll, then toggle session
          e.preventDefault();
          onStartStop();
          break;
        case "m":
        case "M":
          onToggleMute();
          break;
        case "Escape":
          onDismiss();
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStartStop, onToggleMute, onDismiss]);
}
