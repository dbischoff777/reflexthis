import type { AchievementId, Achievement } from '@/lib/achievements';

/**
 * Map local achievement IDs (used in `lib/achievements.ts`) to Steamworks
 * achievement API names (configured in Steamworks Partner backend).
 *
 * Keep this stable once shipped (changing API names breaks unlock continuity).
 */
export const STEAM_ACHIEVEMENT_MAP: Record<AchievementId, string> = {
  // Score
  score_100: 'ACH_SCORE_100',
  score_250: 'ACH_SCORE_250',
  score_500: 'ACH_SCORE_500',
  score_1000: 'ACH_SCORE_1000',
  score_2000: 'ACH_SCORE_2000',
  score_5000: 'ACH_SCORE_5000',
  score_10000: 'ACH_SCORE_10000',
  score_20000: 'ACH_SCORE_20000',
  score_50000: 'ACH_SCORE_50000',
  score_100000: 'ACH_SCORE_100000',
  score_200000: 'ACH_SCORE_200000',
  score_500000: 'ACH_SCORE_500000',
  score_1000000: 'ACH_SCORE_1000000',
  score_2000000: 'ACH_SCORE_2000000',
  score_5000000: 'ACH_SCORE_5000000',
  score_10000000: 'ACH_SCORE_10000000',
  score_20000000: 'ACH_SCORE_20000000',
  score_50000000: 'ACH_SCORE_50000000',
  score_100000000: 'ACH_SCORE_100000000',

  // Combo
  combo_10: 'ACH_COMBO_10',
  combo_20: 'ACH_COMBO_20',
  combo_30: 'ACH_COMBO_30',
  combo_50: 'ACH_COMBO_50',
  combo_100: 'ACH_COMBO_100',
  combo_200: 'ACH_COMBO_200',
  combo_300: 'ACH_COMBO_300',
  combo_500: 'ACH_COMBO_500',
  combo_1000: 'ACH_COMBO_1000',
  combo_2000: 'ACH_COMBO_2000',
  combo_5000: 'ACH_COMBO_5000',
  combo_10000: 'ACH_COMBO_10000',

  // Reaction
  reaction_250: 'ACH_REACTION_250',
  reaction_200: 'ACH_REACTION_200',
  reaction_150: 'ACH_REACTION_150',
  reaction_100: 'ACH_REACTION_100',
  reaction_75: 'ACH_REACTION_75',
  reaction_50: 'ACH_REACTION_50',
  reaction_25: 'ACH_REACTION_25',
  reaction_10: 'ACH_REACTION_10',
  reaction_5: 'ACH_REACTION_5',

  // Modes
  mode_reflex: 'ACH_MODE_REFLEX',
  mode_sequence: 'ACH_MODE_SEQUENCE',
  mode_survival: 'ACH_MODE_SURVIVAL',
  mode_nightmare: 'ACH_MODE_NIGHTMARE',
  mode_nightmare_master: 'ACH_MODE_NIGHTMARE_MASTER',

  // Consistency / special
  flawless_streak: 'ACH_FLAWLESS_STREAK',
  games_100: 'ACH_GAMES_100',
  games_500: 'ACH_GAMES_500',
  games_1000: 'ACH_GAMES_1000',
  playtime_hour: 'ACH_PLAYTIME_HOUR',
  playtime_2hours: 'ACH_PLAYTIME_2HOURS',
  playtime_4hours: 'ACH_PLAYTIME_4HOURS',
  playtime_8hours: 'ACH_PLAYTIME_8HOURS',
  playtime_16hours: 'ACH_PLAYTIME_16HOURS',
  playtime_32hours: 'ACH_PLAYTIME_32HOURS',
  playtime_64hours: 'ACH_PLAYTIME_64HOURS',
  playtime_128hours: 'ACH_PLAYTIME_128HOURS',
  playtime_999hours: 'ACH_PLAYTIME_999HOURS',
  hard_90s: 'ACH_HARD_90S',
  all_modes: 'ACH_ALL_MODES',
};

export function getSteamAchievementApiName(localAchievementId: string): string | null {
  return (STEAM_ACHIEVEMENT_MAP as Record<string, string>)[localAchievementId] ?? null;
}

export function hasSteamMapping(achievement: Achievement): boolean {
  return achievement.id in STEAM_ACHIEVEMENT_MAP;
}

