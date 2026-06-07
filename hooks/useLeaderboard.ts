"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadLeaderboard,
  loadPlayerName,
  savePlayerName,
  submitSession,
} from "@/lib/LeaderboardStore";
import { initialiseBots, advanceBots } from "@/lib/FakeSpeakers";
import type { LeaderboardEntry, SessionSummaryData } from "@/types";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState<string>("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionSummaryData | null>(null);

  // On mount: initialise bots (no-op if already done), then load board
  useEffect(() => {
    initialiseBots();
    setEntries(loadLeaderboard());
    const stored = loadPlayerName();
    if (stored) setPlayerName(stored);
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadLeaderboard());
  }, []);

  /** Call after a session ends to trigger the save + bot-advance flow */
  const offerSave = useCallback(
    (session: SessionSummaryData) => {
      const storedName = loadPlayerName();
      if (storedName) {
        const updated = submitSession(storedName, session);
        // Advance bots using user's new competence score
        advanceBots(updated.competenceScore);
        setPlayerName(storedName);
        setEntries(loadLeaderboard());
        return updated;
      }
      // No name yet — queue and prompt
      setPendingSession(session);
      setShowNamePrompt(true);
      return null;
    },
    []
  );

  /** Confirm a name — saves pending session, advances bots */
  const confirmName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      savePlayerName(trimmed);
      setPlayerName(trimmed);
      setShowNamePrompt(false);

      if (pendingSession) {
        const saved = submitSession(trimmed, pendingSession);
        advanceBots(saved.competenceScore);
        setPendingSession(null);
        setEntries(loadLeaderboard());
      }
    },
    [pendingSession]
  );

  const dismissNamePrompt = useCallback(() => {
    setShowNamePrompt(false);
    setPendingSession(null);
  }, []);

  const openLeaderboard = useCallback(() => {
    refresh(); // always show fresh bot scores when panel opens
    setShowLeaderboard(true);
  }, [refresh]);

  const closeLeaderboard = useCallback(() => setShowLeaderboard(false), []);

  /** 1-based rank of current player, or null */
  const myRank = playerName
    ? (entries.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase()) + 1) || null
    : null;

  return {
    entries,
    playerName,
    myRank,
    showLeaderboard,
    showNamePrompt,
    offerSave,
    confirmName,
    dismissNamePrompt,
    openLeaderboard,
    closeLeaderboard,
  };
}
