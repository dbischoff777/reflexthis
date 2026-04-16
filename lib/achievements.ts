/**
 * Achievement/Badge System for ReflexThis
 * Tracks player milestones and accomplishments
 */

import { SessionStatistics, GameSession } from '@/lib/sessionStats';
import { GameMode } from '@/lib/gameModes';
import { DifficultyPreset } from '@/lib/difficulty';
import type { UserProgress } from '@/lib/progression';
import { getUserProgress } from '@/lib/progression';

export type AchievementCategory = 'score' | 'combo' | 'reaction' | 'mode' | 'consistency' | 'special' | 'progression';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Emoji or icon identifier
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  target: number;
  // Optional filters for specific conditions
  gameMode?: GameMode;
  difficulty?: DifficultyPreset;
  checkCondition: (stats: SessionStatistics, sessions: GameSession[], progress: UserProgress) => boolean;
  getProgress: (stats: SessionStatistics, sessions: GameSession[], progress: UserProgress) => { current: number; target: number };
}

const STORAGE_KEY = 'reflexthis_achievements';

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number; // Timestamp
}

/**
 * Get all unlocked achievements from localStorage
 */
export function getUnlockedAchievements(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    
    const unlocked: UnlockedAchievement[] = JSON.parse(stored);
    return new Set(unlocked.map(a => a.id));
  } catch (error) {
    console.error('Error loading achievements:', error);
    return new Set();
  }
}

/**
 * Unlock an achievement
 */
export function unlockAchievement(achievementId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const unlocked = getUnlockedAchievements();
  if (unlocked.has(achievementId)) return false; // Already unlocked
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const unlockedList: UnlockedAchievement[] = stored ? JSON.parse(stored) : [];
    
    unlockedList.push({
      id: achievementId,
      unlockedAt: Date.now(),
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedList));
    return true; // Newly unlocked
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return false;
  }
}

/**
 * Check and unlock achievements based on current stats
 * Returns newly unlocked achievement IDs
 */
export function checkAndUnlockAchievements(
  stats: SessionStatistics,
  sessions: GameSession[],
  progress: UserProgress = getUserProgress()
): string[] {
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: string[] = [];
  
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue; // Already unlocked
    
    if (achievement.checkCondition(stats, sessions, progress)) {
      if (unlockAchievement(achievement.id)) {
        newlyUnlocked.push(achievement.id);
      }
    }
  }
  
  return newlyUnlocked;
}

/**
 * Get achievement progress for display
 */
export function getAchievementProgress(
  stats: SessionStatistics,
  sessions: GameSession[],
  progress: UserProgress = getUserProgress()
): Array<Achievement & { unlocked: boolean; progress: { current: number; target: number } }> {
  const unlocked = getUnlockedAchievements();
  
  return ALL_ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id),
    progress: achievement.getProgress(stats, sessions, progress),
  }));
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

type AchievementRarity = Achievement['rarity'];

const SCORE_MILESTONES = [
  100, 250, 500, 1000, 2000, 5000,
  10000, 20000, 50000, 100000, 200000, 500000,
  1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000,
] as const;

const COMBO_MILESTONES = [
  10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000,
] as const;

const REACTION_MILESTONES_MS = [
  250, 200, 150, 100, 75, 50, 25, 10, 5,
] as const;

const GAMES_MILESTONES = [100, 500, 1000] as const;

const PLAYTIME_MILESTONES_MS: ReadonlyArray<{ id: string; ms: number; label: string; rarity: AchievementRarity }> = [
  { id: 'playtime_hour', ms: 1 * 60 * 60 * 1000, label: '1 hour', rarity: 'rare' },
  { id: 'playtime_2hours', ms: 2 * 60 * 60 * 1000, label: '2 hours', rarity: 'rare' },
  { id: 'playtime_4hours', ms: 4 * 60 * 60 * 1000, label: '4 hours', rarity: 'epic' },
  { id: 'playtime_8hours', ms: 8 * 60 * 60 * 1000, label: '8 hours', rarity: 'epic' },
  { id: 'playtime_16hours', ms: 16 * 60 * 60 * 1000, label: '16 hours', rarity: 'legendary' },
  { id: 'playtime_32hours', ms: 32 * 60 * 60 * 1000, label: '32 hours', rarity: 'legendary' },
  { id: 'playtime_64hours', ms: 64 * 60 * 60 * 1000, label: '64 hours', rarity: 'legendary' },
  { id: 'playtime_128hours', ms: 128 * 60 * 60 * 1000, label: '128 hours', rarity: 'legendary' },
  { id: 'playtime_999hours', ms: 999 * 60 * 60 * 1000, label: '999 hours', rarity: 'legendary' },
];

const LEVEL_MILESTONES: ReadonlyArray<number> = [
  // Early progression: every 10 levels up to 100
  ...Array.from({ length: 10 }, (_, i) => (i + 1) * 10),
  // Mid progression: every 50 up to 500
  150, 200, 250, 300, 350, 400, 450, 500,
  // Late progression: every 100 up to 900
  600, 700, 800, 900,
  // Ultimate
  999,
];

function levelRarityForTarget(level: number): AchievementRarity {
  if (level >= 999) return 'legendary';
  if (level >= 500) return 'legendary';
  if (level >= 200) return 'epic';
  if (level >= 50) return 'rare';
  return 'common';
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${Math.round(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function scoreRarityForTarget(score: number): AchievementRarity {
  if (score >= 1_000_000) return 'legendary';
  if (score >= 100_000) return 'epic';
  if (score >= 5_000) return 'rare';
  return 'common';
}

function comboRarityForTarget(combo: number): AchievementRarity {
  if (combo >= 1000) return 'legendary';
  if (combo >= 200) return 'epic';
  if (combo >= 50) return 'rare';
  return 'common';
}

function reactionRarityForTarget(ms: number): AchievementRarity {
  if (ms <= 25) return 'legendary';
  if (ms <= 75) return 'epic';
  if (ms <= 150) return 'rare';
  return 'common';
}

const SCORE_ACHIEVEMENTS: Achievement[] = SCORE_MILESTONES.map((target) => ({
  id: `score_${target}`,
  title: target <= 2000 ? 'Score Milestone' : 'High Score Milestone',
  description: `Score ${formatCompactNumber(target)} points in a single run.`,
  category: 'score',
  icon: '🎯',
  rarity: scoreRarityForTarget(target),
  target,
  checkCondition: (stats) => (stats.bestScore ?? 0) >= target,
  getProgress: (stats) => ({
    current: Math.min(stats.bestScore ?? 0, target),
    target,
  }),
}));

const COMBO_ACHIEVEMENTS: Achievement[] = COMBO_MILESTONES.map((target) => ({
  id: `combo_${target}`,
  title: target < 100 ? 'Combo Milestone' : 'Combo Mastery',
  description: `Reach a ${target}x combo in a single run.`,
  category: 'combo',
  icon: '🔥',
  rarity: comboRarityForTarget(target),
  target,
  checkCondition: (stats) => (stats.bestCombo ?? 0) >= target,
  getProgress: (stats) => ({
    current: Math.min(stats.bestCombo ?? 0, target),
    target,
  }),
}));

const REACTION_ACHIEVEMENTS: Achievement[] = REACTION_MILESTONES_MS.map((targetMs) => ({
  id: `reaction_${targetMs}`,
  title: targetMs <= 50 ? 'Reflex Reactor' : 'Fast Reflexes',
  description: `Achieve a reaction time under ${targetMs}ms.`,
  category: 'reaction',
  icon: '⚡',
  rarity: reactionRarityForTarget(targetMs),
  target: targetMs,
  checkCondition: (stats) => {
    const fastest = stats.fastestReactionTime;
    return fastest !== null && fastest <= targetMs;
  },
  getProgress: (stats) => {
    const fastest = stats.fastestReactionTime;
    if (fastest === null) return { current: 0, target: targetMs };
    return {
      current: Math.max(0, targetMs - fastest),
      target: targetMs,
    };
  },
}));

const GAMES_ACHIEVEMENTS: Achievement[] = GAMES_MILESTONES.map((target) => ({
  id: `games_${target}`,
  title: target >= 1000 ? 'Master Grinder' : target >= 500 ? 'Dedicated' : 'Veteran',
  description: `Play ${target} games.`,
  category: 'consistency',
  icon: '🏆',
  rarity: target >= 1000 ? 'legendary' : target >= 500 ? 'epic' : 'rare',
  target,
  checkCondition: (stats) => stats.totalGames >= target,
  getProgress: (stats) => ({
    current: Math.min(stats.totalGames, target),
    target,
  }),
}));

const PLAYTIME_ACHIEVEMENTS: Achievement[] = PLAYTIME_MILESTONES_MS.map(({ id, ms, label, rarity }) => ({
  id,
  title: 'Marathon Player',
  description: `Accumulate ${label} of total playtime.`,
  category: 'consistency',
  icon: '⏱️',
  rarity,
  target: ms,
  checkCondition: (stats) => stats.totalPlaytime >= ms,
  getProgress: (stats) => ({
    current: Math.min(stats.totalPlaytime, ms),
    target: ms,
  }),
}));

const LEVEL_ACHIEVEMENTS: Achievement[] = LEVEL_MILESTONES.map((targetLevel) => ({
  id: `level_${targetLevel}`,
  title: 'Level Up',
  description: `Reach player level ${targetLevel}.`,
  category: 'progression',
  icon: '📈',
  rarity: levelRarityForTarget(targetLevel),
  target: targetLevel,
  checkCondition: (_stats, _sessions, progress) => progress.level >= targetLevel,
  getProgress: (_stats, _sessions, progress) => ({
    current: Math.min(progress.level, targetLevel),
    target: targetLevel,
  }),
}));

const MODE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'mode_reflex',
    title: 'Reflex Master',
    description: 'Score 300+ in Reflex mode.',
    category: 'mode',
    icon: '🎮',
    rarity: 'rare',
    target: 300,
    gameMode: 'reflex',
    checkCondition: (_stats, sessions) => sessions.some((s) => s.gameMode === 'reflex' && s.score >= 300),
    getProgress: (_stats, sessions) => {
      const best = sessions.filter((s) => s.gameMode === 'reflex').reduce((m, s) => Math.max(m, s.score), 0);
      return { current: Math.min(best, 300), target: 300 };
    },
  },
  {
    id: 'mode_sequence',
    title: 'Sequence Master',
    description: 'Complete 10+ sequences correctly.',
    category: 'mode',
    icon: '🧩',
    rarity: 'rare',
    target: 10,
    gameMode: 'sequence',
    checkCondition: (_stats, sessions) => sessions.some((s) => s.gameMode === 'sequence' && s.score >= 10),
    getProgress: (_stats, sessions) => {
      const best = sessions.filter((s) => s.gameMode === 'sequence').reduce((m, s) => Math.max(m, s.score), 0);
      return { current: Math.min(best, 10), target: 10 };
    },
  },
  {
    id: 'mode_survival',
    title: 'Survival Legend',
    description: 'Survive for 60 seconds in Survival mode.',
    category: 'mode',
    icon: '💀',
    rarity: 'epic',
    target: 60,
    gameMode: 'survival',
    checkCondition: (_stats, sessions) =>
      sessions.some((s) => s.gameMode === 'survival' && Math.floor(s.duration / 1000) >= 60),
    getProgress: (_stats, sessions) => {
      const best = sessions
        .filter((s) => s.gameMode === 'survival')
        .reduce((m, s) => Math.max(m, Math.floor(s.duration / 1000)), 0);
      return { current: Math.min(best, 60), target: 60 };
    },
  },
  {
    id: 'mode_nightmare',
    title: 'Nightmare Conqueror',
    description: 'Score 500+ in Nightmare mode.',
    category: 'mode',
    icon: '🔥',
    rarity: 'legendary',
    target: 500,
    gameMode: 'nightmare',
    checkCondition: (_stats, sessions) => sessions.some((s) => s.gameMode === 'nightmare' && s.score >= 500),
    getProgress: (_stats, sessions) => {
      const best = sessions.filter((s) => s.gameMode === 'nightmare').reduce((m, s) => Math.max(m, s.score), 0);
      return { current: Math.min(best, 500), target: 500 };
    },
  },
  {
    id: 'mode_nightmare_master',
    title: 'Nightmare Master',
    description: 'Score 1000000+ in Nightmare mode. The ultimate challenge.',
    category: 'mode',
    icon: '💀',
    rarity: 'legendary',
    target: 1_000_000,
    gameMode: 'nightmare',
    checkCondition: (_stats, sessions) => sessions.some((s) => s.gameMode === 'nightmare' && s.score >= 1_000_000),
    getProgress: (_stats, sessions) => {
      const best = sessions.filter((s) => s.gameMode === 'nightmare').reduce((m, s) => Math.max(m, s.score), 0);
      return { current: Math.min(best, 1_000_000), target: 1_000_000 };
    },
  },
];

const SPECIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'flawless_streak',
    title: 'Flawless Streak',
    description: 'Maintain a 40x combo streak in a single run.',
    category: 'consistency',
    icon: '✨',
    rarity: 'epic',
    target: 40,
    checkCondition: (stats) => (stats.bestCombo ?? 0) >= 40,
    getProgress: (stats) => ({
      current: Math.min(stats.bestCombo ?? 0, 40),
      target: 40,
    }),
  },
  {
    id: 'hard_90s',
    title: 'Hard Endurance',
    description: 'Survive for 90 seconds on Hard difficulty.',
    category: 'special',
    icon: '💪',
    rarity: 'epic',
    target: 90,
    difficulty: 'hard',
    checkCondition: (_stats, sessions) => {
      const hardRuns = sessions.filter((s) => s.difficulty === 'hard');
      return hardRuns.some((s) => Math.floor(s.duration / 1000) >= 90);
    },
    getProgress: (_stats, sessions) => {
      const best = sessions
        .filter((s) => s.difficulty === 'hard')
        .reduce((m, s) => Math.max(m, Math.floor(s.duration / 1000)), 0);
      return { current: Math.min(best, 90), target: 90 };
    },
  },
  {
    id: 'all_modes',
    title: 'Mode Explorer',
    description: 'Play all game modes at least once.',
    category: 'special',
    icon: '🗺️',
    rarity: 'rare',
    target: 4, // reflex, sequence, survival, nightmare
    checkCondition: (_stats, sessions) => {
      const modesPlayed = new Set(sessions.map((s) => s.gameMode).filter(Boolean));
      return modesPlayed.size >= 4;
    },
    getProgress: (_stats, sessions) => {
      const modesPlayed = new Set(sessions.map((s) => s.gameMode).filter(Boolean));
      return { current: Math.min(modesPlayed.size, 4), target: 4 };
    },
  },
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  ...SCORE_ACHIEVEMENTS,
  ...COMBO_ACHIEVEMENTS,
  ...REACTION_ACHIEVEMENTS,
  ...MODE_ACHIEVEMENTS,
  ...GAMES_ACHIEVEMENTS,
  ...PLAYTIME_ACHIEVEMENTS,
  ...LEVEL_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
];

export type AchievementId = (typeof ALL_ACHIEVEMENTS)[number]['id'];

export const ALL_ACHIEVEMENT_IDS: ReadonlyArray<AchievementId> = ALL_ACHIEVEMENTS.map((a) => a.id as AchievementId);

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ALL_ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.category === category);
}

