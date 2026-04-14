import type { SessionStatistics, GameSession } from '@/lib/sessionStats';
import type { AchievementId } from '@/lib/achievements';

export type SteamStatIntName =
  | 'STAT_BEST_SCORE'
  | 'STAT_BEST_COMBO'
  | 'STAT_FASTEST_REACTION_MS'
  | 'STAT_GAMES_PLAYED'
  | 'STAT_PLAYTIME_SECONDS'
  | 'STAT_MODE_REFLEX_PLAYED'
  | 'STAT_MODE_SEQUENCE_PLAYED'
  | 'STAT_MODE_SURVIVAL_PLAYED'
  | 'STAT_MODE_NIGHTMARE_PLAYED';

export const STEAM_INT_STATS: ReadonlyArray<SteamStatIntName> = [
  'STAT_BEST_SCORE',
  'STAT_BEST_COMBO',
  'STAT_FASTEST_REACTION_MS',
  'STAT_GAMES_PLAYED',
  'STAT_PLAYTIME_SECONDS',
  'STAT_MODE_REFLEX_PLAYED',
  'STAT_MODE_SEQUENCE_PLAYED',
  'STAT_MODE_SURVIVAL_PLAYED',
  'STAT_MODE_NIGHTMARE_PLAYED',
];

export type SteamAchievementProgressBinding = Readonly<{
  achievementId: AchievementId;
  statName: SteamStatIntName;
  unlockValue: number;
}>;

// These mirror the unlock conditions in `lib/achievements.ts`, but in Steam-friendly
// stats that can be bound as "Progress Stat" in the Steamworks backend.
export const STEAM_ACHIEVEMENT_PROGRESS_BINDINGS: ReadonlyArray<SteamAchievementProgressBinding> = [
  // Score milestones (best-ever score)
  { achievementId: 'score_100', statName: 'STAT_BEST_SCORE', unlockValue: 100 },
  { achievementId: 'score_250', statName: 'STAT_BEST_SCORE', unlockValue: 250 },
  { achievementId: 'score_500', statName: 'STAT_BEST_SCORE', unlockValue: 500 },
  { achievementId: 'score_1000', statName: 'STAT_BEST_SCORE', unlockValue: 1000 },
  { achievementId: 'score_2000', statName: 'STAT_BEST_SCORE', unlockValue: 2000 },
  { achievementId: 'score_5000', statName: 'STAT_BEST_SCORE', unlockValue: 5000 },
  { achievementId: 'score_10000', statName: 'STAT_BEST_SCORE', unlockValue: 10000 },
  { achievementId: 'score_20000', statName: 'STAT_BEST_SCORE', unlockValue: 20000 },
  { achievementId: 'score_50000', statName: 'STAT_BEST_SCORE', unlockValue: 50000 },
  { achievementId: 'score_100000', statName: 'STAT_BEST_SCORE', unlockValue: 100000 },
  { achievementId: 'score_200000', statName: 'STAT_BEST_SCORE', unlockValue: 200000 },
  { achievementId: 'score_500000', statName: 'STAT_BEST_SCORE', unlockValue: 500000 },
  { achievementId: 'score_1000000', statName: 'STAT_BEST_SCORE', unlockValue: 1000000 },
  { achievementId: 'score_2000000', statName: 'STAT_BEST_SCORE', unlockValue: 2000000 },
  { achievementId: 'score_5000000', statName: 'STAT_BEST_SCORE', unlockValue: 5000000 },
  { achievementId: 'score_10000000', statName: 'STAT_BEST_SCORE', unlockValue: 10000000 },
  { achievementId: 'score_20000000', statName: 'STAT_BEST_SCORE', unlockValue: 20000000 },
  { achievementId: 'score_50000000', statName: 'STAT_BEST_SCORE', unlockValue: 50000000 },
  { achievementId: 'score_100000000', statName: 'STAT_BEST_SCORE', unlockValue: 100000000 },

  // Combo milestones (best-ever combo)
  { achievementId: 'combo_10', statName: 'STAT_BEST_COMBO', unlockValue: 10 },
  { achievementId: 'combo_20', statName: 'STAT_BEST_COMBO', unlockValue: 20 },
  { achievementId: 'combo_30', statName: 'STAT_BEST_COMBO', unlockValue: 30 },
  { achievementId: 'combo_50', statName: 'STAT_BEST_COMBO', unlockValue: 50 },
  { achievementId: 'combo_100', statName: 'STAT_BEST_COMBO', unlockValue: 100 },
  { achievementId: 'combo_200', statName: 'STAT_BEST_COMBO', unlockValue: 200 },
  { achievementId: 'combo_300', statName: 'STAT_BEST_COMBO', unlockValue: 300 },
  { achievementId: 'combo_500', statName: 'STAT_BEST_COMBO', unlockValue: 500 },
  { achievementId: 'combo_1000', statName: 'STAT_BEST_COMBO', unlockValue: 1000 },
  { achievementId: 'combo_2000', statName: 'STAT_BEST_COMBO', unlockValue: 2000 },
  { achievementId: 'combo_5000', statName: 'STAT_BEST_COMBO', unlockValue: 5000 },
  { achievementId: 'combo_10000', statName: 'STAT_BEST_COMBO', unlockValue: 10000 },
  { achievementId: 'flawless_streak', statName: 'STAT_BEST_COMBO', unlockValue: 40 },

  // Total games played
  { achievementId: 'games_100', statName: 'STAT_GAMES_PLAYED', unlockValue: 100 },
  { achievementId: 'games_500', statName: 'STAT_GAMES_PLAYED', unlockValue: 500 },
  { achievementId: 'games_1000', statName: 'STAT_GAMES_PLAYED', unlockValue: 1000 },

  // Total playtime (seconds)
  { achievementId: 'playtime_hour', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 3600 },
  { achievementId: 'playtime_2hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 2 * 3600 },
  { achievementId: 'playtime_4hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 4 * 3600 },
  { achievementId: 'playtime_8hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 8 * 3600 },
  { achievementId: 'playtime_16hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 16 * 3600 },
  { achievementId: 'playtime_32hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 32 * 3600 },
  { achievementId: 'playtime_64hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 64 * 3600 },
  { achievementId: 'playtime_128hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 128 * 3600 },
  { achievementId: 'playtime_999hours', statName: 'STAT_PLAYTIME_SECONDS', unlockValue: 999 * 3600 },

  // Reaction-time achievements: these are "under X ms". Steam progress stat unlocks when >= unlockValue,
  // so we invert to a "reaction score" stat if you want auto-unlock. We keep these as manual unlocks for now.
];

export function getSteamIntStatsFromLocalStats(
  stats: SessionStatistics,
  sessions: GameSession[]
): Record<SteamStatIntName, number> {
  const modesPlayed = new Set(sessions.map((s) => s.gameMode).filter(Boolean));
  const fastestMs = stats.fastestReactionTime ?? 0;

  return {
    STAT_BEST_SCORE: stats.bestScore ?? 0,
    STAT_BEST_COMBO: stats.bestCombo ?? 0,
    STAT_FASTEST_REACTION_MS: Math.max(0, Math.trunc(fastestMs)),
    STAT_GAMES_PLAYED: stats.totalGames ?? 0,
    STAT_PLAYTIME_SECONDS: Math.max(0, Math.trunc((stats.totalPlaytime ?? 0) / 1000)),
    STAT_MODE_REFLEX_PLAYED: modesPlayed.has('reflex') ? 1 : 0,
    STAT_MODE_SEQUENCE_PLAYED: modesPlayed.has('sequence') ? 1 : 0,
    STAT_MODE_SURVIVAL_PLAYED: modesPlayed.has('survival') ? 1 : 0,
    STAT_MODE_NIGHTMARE_PLAYED: modesPlayed.has('nightmare') ? 1 : 0,
  };
}

