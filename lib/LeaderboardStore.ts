/**
 * LeaderboardStore
 *
 * Thin localStorage wrapper.
 * - Keeps one entry per player name (personal best only).
 * - Merges real entries with bot entries from FakeSpeakers.
 * - Sorted by competenceScore descending on every read.
 * - Gracefully handles missing / corrupt storage data.
 */

import { computeCompetence } from "./CompetenceScorer";
import { getBotEntries } from "./FakeSpeakers";
import type { LeaderboardEntry, SessionSummaryData } from "@/types";

const STORAGE_KEY = "src_leaderboard_v1";
const NAME_KEY    = "src_player_name_v1";

// ── Public API ────────────────────────────────────────────────────────────

/** Load all entries (real + bots) sorted by score desc */
export function loadLeaderboard(): LeaderboardEntry[] {
  const real = loadRealEntries();
  const bots = getBotEntries();

  // Merge: bots fill in where no real entry has the same name
  const all = [...real];
  for (const bot of bots) {
    const clash = real.find((r) => r.name.toLowerCase() === bot.name.toLowerCase());
    if (!clash) all.push(bot);
  }

  return all.sort((a, b) => b.competenceScore - a.competenceScore);
}

/** Load only real (human) entries */
export function loadRealEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Submit a session result for a named player.
 * Only updates the entry if the new score is strictly higher (personal best).
 * Returns the saved entry.
 */
export function submitSession(
  name: string,
  session: SessionSummaryData
): LeaderboardEntry {
  const { score, tier } = computeCompetence(session);
  const entries = loadLeaderboard();

  const existingIdx = entries.findIndex(
    (e) => e.name.toLowerCase() === name.toLowerCase()
  );

  if (existingIdx !== -1) {
    const existing = entries[existingIdx];
    // Always increment totalSessions
    const updated: LeaderboardEntry = {
      ...existing,
      totalSessions: existing.totalSessions + 1,
      // Only replace score/tier/session if strictly better
      ...(score > existing.competenceScore
        ? { competenceScore: score, tier, bestSession: session, achievedAt: new Date().toISOString() }
        : {}),
    };
    entries[existingIdx] = updated;
    save(entries);
    return updated;
  }

  // New player
  const entry: LeaderboardEntry = {
    id: generateId(),
    name: name.trim(),
    competenceScore: score,
    tier,
    bestSession: session,
    achievedAt: new Date().toISOString(),
    totalSessions: 1,
  };
  entries.push(entry);
  save(entries);
  return entry;
}

/** Persist the current player name across page loads */
export function savePlayerName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
}

export function loadPlayerName(): string | null {
  try { return localStorage.getItem(NAME_KEY); } catch { return null; }
}

export function clearLeaderboard(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ── Private ───────────────────────────────────────────────────────────────

function save(entries: LeaderboardEntry[]): void {
  try {
    // Only persist real (non-bot) entries
    const real = entries.filter((e) => !e.isBot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(real));
  } catch { /* quota exceeded — silently skip */ }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
