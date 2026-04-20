import type { GameMode } from '@/lib/gameModes';
import type { DifficultyPreset } from '@/lib/difficulty';

/**
 * Centralized Steam leaderboard naming.
 *
 * Steam leaderboards are separate entities, so to track mode + difficulty you
 * should use one leaderboard per (mode × difficulty).
 */
export function getSteamLeaderboardName(mode: GameMode, difficulty: DifficultyPreset): string {
  // Keep names stable; changing this will create new leaderboards.
  // Nightmare difficulty is only valid for Nightmare mode in this game.
  if (mode === 'nightmare' || difficulty === 'nightmare') return 'LB_NIGHTMARE_BEST_SCORE';
  return `LB_${mode}_${difficulty}_BEST_SCORE`;
}

