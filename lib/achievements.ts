/**
 * Achievement/Badge System for ReflexThis
 * Tracks player milestones and accomplishments
 */

import { SessionStatistics, GameSession } from '@/lib/sessionStats';
import { GameMode } from '@/lib/gameModes';
import { DifficultyPreset } from '@/lib/difficulty';

export type AchievementCategory = 'score' | 'combo' | 'reaction' | 'mode' | 'consistency' | 'special';

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
  checkCondition: (stats: SessionStatistics, sessions: GameSession[]) => boolean;
  getProgress: (stats: SessionStatistics, sessions: GameSession[]) => { current: number; target: number };
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
  sessions: GameSession[]
): string[] {
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: string[] = [];
  
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue; // Already unlocked
    
    if (achievement.checkCondition(stats, sessions)) {
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
  sessions: GameSession[]
): Array<Achievement & { unlocked: boolean; progress: { current: number; target: number } }> {
  const unlocked = getUnlockedAchievements();
  
  return ALL_ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id),
    progress: achievement.getProgress(stats, sessions),
  }));
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

const ALL_ACHIEVEMENTS: Achievement[] = [
  // Score Milestones
  {
    id: 'score_100',
    title: 'Getting Started',
    description: 'Score 100 points in a single run.',
    category: 'score',
    icon: '🎯',
    rarity: 'common',
    target: 100,
    checkCondition: (stats) => (stats.bestScore ?? 0) >= 100,
    getProgress: (stats) => ({
      current: Math.min(stats.bestScore ?? 0, 100),
      target: 100,
    }),
  },
  {
    id: 'score_250',
    title: 'Score Hunter',
    description: 'Score 250 points in a single run.',
    category: 'score',
    icon: '🏹',
    rarity: 'common',
    target: 250,
    checkCondition: (stats) => (stats.bestScore ?? 0) >= 250,
    getProgress: (stats) => ({
      current: Math.min(stats.bestScore ?? 0, 250),
      target: 250,
    }),
  },
  {
    id: 'score_500',
    title: 'Score Master',
    description: 'Score 500 points in a single run.',
    category: 'score',
    icon: '⭐',
    rarity: 'rare',
    target: 500,
    checkCondition: (stats) => (stats.bestScore ?? 0) >= 500,
    getProgress: (stats) => ({
      current: Math.min(stats.bestScore ?? 0, 500),
      target: 500,
    }),
  },
  {
    id: 'score_1000',
    title: 'Score Legend',
    description: 'Score 1000 points in a single run.',
    category: 'score',
    icon: '👑',
    rarity: 'epic',
    target: 1000,
    checkCondition: (stats) => (stats.bestScore ?? 0) >= 1000,
    getProgress: (stats) => ({
      current: Math.min(stats.bestScore ?? 0, 1000),
      target: 1000,
    }),
  },
  {
    id: 'score_2000',
    title: 'Score Deity',
    description: 'Score 2000 points in a single run.',
    category: 'score',
    icon: '⚡',
    rarity: 'legendary',
    target: 2000,
    checkCondition: (stats) => (stats.bestScore ?? 0) >= 2000,
    getProgress: (stats) => ({
      current: Math.min(stats.bestScore ?? 0, 2000),
      target: 2000,
    }),
  },
  
  // Combo Achievements
  {
    id: 'combo_10',
    title: 'Combo Initiate',
    description: 'Reach a 10x combo in a single run.',
    category: 'combo',
    icon: '🔥',
    rarity: 'common',
    target: 10,
    checkCondition: (stats) => (stats.bestCombo ?? 0) >= 10,
    getProgress: (stats) => ({
      current: Math.min(stats.bestCombo ?? 0, 10),
      target: 10,
    }),
  },
  {
    id: 'combo_20',
    title: 'Combo Master',
    description: 'Reach a 20x combo in a single run.',
    category: 'combo',
    icon: '💥',
    rarity: 'rare',
    target: 20,
    checkCondition: (stats) => (stats.bestCombo ?? 0) >= 20,
    getProgress: (stats) => ({
      current: Math.min(stats.bestCombo ?? 0, 20),
      target: 20,
    }),
  },
  {
    id: 'combo_30',
    title: 'Combo Legend',
    description: 'Reach a 30x combo in a single run.',
    category: 'combo',
    icon: '🌟',
    rarity: 'epic',
    target: 30,
    checkCondition: (stats) => (stats.bestCombo ?? 0) >= 30,
    getProgress: (stats) => ({
      current: Math.min(stats.bestCombo ?? 0, 30),
      target: 30,
    }),
  },
  {
    id: 'combo_50',
    title: 'Combo Deity',
    description: 'Reach a 50x combo in a single run.',
    category: 'combo',
    icon: '💫',
    rarity: 'legendary',
    target: 50,
    checkCondition: (stats) => (stats.bestCombo ?? 0) >= 50,
    getProgress: (stats) => ({
      current: Math.min(stats.bestCombo ?? 0, 50),
      target: 50,
    }),
  },
  
  // Reaction Time Achievements
  {
    id: 'reaction_250',
    title: 'Lightning Fast',
    description: 'Achieve a reaction time under 250ms.',
    category: 'reaction',
    icon: '⚡',
    rarity: 'rare',
    target: 250,
    checkCondition: (stats) => {
      const fastest = stats.fastestReactionTime;
      return fastest !== null && fastest <= 250;
    },
    getProgress: (stats) => {
      const fastest = stats.fastestReactionTime;
      if (fastest === null) return { current: 0, target: 250 };
      return {
        current: Math.max(0, 250 - fastest),
        target: 250,
      };
    },
  },
  {
    id: 'reaction_200',
    title: 'Superhuman',
    description: 'Achieve a reaction time under 200ms.',
    category: 'reaction',
    icon: '🚀',
    rarity: 'epic',
    target: 200,
    checkCondition: (stats) => {
      const fastest = stats.fastestReactionTime;
      return fastest !== null && fastest <= 200;
    },
    getProgress: (stats) => {
      const fastest = stats.fastestReactionTime;
      if (fastest === null) return { current: 0, target: 200 };
      return {
        current: Math.max(0, 200 - fastest),
        target: 200,
      };
    },
  },
  {
    id: 'reaction_150',
    title: 'Godlike Reflexes',
    description: 'Achieve a reaction time under 150ms.',
    category: 'reaction',
    icon: '⚡',
    rarity: 'legendary',
    target: 150,
    checkCondition: (stats) => {
      const fastest = stats.fastestReactionTime;
      return fastest !== null && fastest <= 150;
    },
    getProgress: (stats) => {
      const fastest = stats.fastestReactionTime;
      if (fastest === null) return { current: 0, target: 150 };
      return {
        current: Math.max(0, 150 - fastest),
        target: 150,
      };
    },
  },
  
  // Mode Mastery
  {
    id: 'mode_reflex',
    title: 'Reflex Master',
    description: 'Score 300+ in Reflex mode.',
    category: 'mode',
    icon: '🎮',
    rarity: 'rare',
    target: 300,
    gameMode: 'reflex',
    checkCondition: (stats, sessions) => {
      const reflexSessions = sessions.filter(s => s.gameMode === 'reflex');
      return reflexSessions.some(s => s.score >= 300);
    },
    getProgress: (stats, sessions) => {
      const reflexSessions = sessions.filter(s => s.gameMode === 'reflex');
      const bestReflex = reflexSessions.length > 0 ? Math.max(...reflexSessions.map(s => s.score)) : 0;
      return {
        current: Math.min(bestReflex, 300),
        target: 300,
      };
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
    checkCondition: (stats, sessions) => {
      const sequenceSessions = sessions.filter(s => s.gameMode === 'sequence');
      return sequenceSessions.some(s => s.score >= 10);
    },
    getProgress: (stats, sessions) => {
      const sequenceSessions = sessions.filter(s => s.gameMode === 'sequence');
      const bestSequence = sequenceSessions.length > 0 ? Math.max(...sequenceSessions.map(s => s.score)) : 0;
      return {
        current: Math.min(bestSequence, 10),
        target: 10,
      };
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
    checkCondition: (stats, sessions) => {
      const survivalSessions = sessions.filter(s => s.gameMode === 'survival');
      return survivalSessions.some(s => Math.floor(s.duration / 1000) >= 60);
    },
    getProgress: (stats, sessions) => {
      const survivalSessions = sessions.filter(s => s.gameMode === 'survival');
      const longestSurvival = survivalSessions.length > 0
        ? Math.max(...survivalSessions.map(s => Math.floor(s.duration / 1000)))
        : 0;
      return {
        current: Math.min(longestSurvival, 60),
        target: 60,
      };
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
    checkCondition: (stats, sessions) => {
      const nightmareSessions = sessions.filter(s => s.gameMode === 'nightmare');
      return nightmareSessions.some(s => s.score >= 500);
    },
    getProgress: (stats, sessions) => {
      const nightmareSessions = sessions.filter(s => s.gameMode === 'nightmare');
      const bestNightmare = nightmareSessions.length > 0
        ? Math.max(...nightmareSessions.map(s => s.score))
        : 0;
      return {
        current: Math.min(bestNightmare, 500),
        target: 500,
      };
    },
  },
  {
    id: 'mode_nightmare_master',
    title: 'Nightmare Master',
    description: 'Score 1000000+ in Nightmare mode. The ultimate challenge.',
    category: 'mode',
    icon: '💀',
    rarity: 'legendary',
    target: 1000000,
    gameMode: 'nightmare',
    checkCondition: (stats, sessions) => {
      const nightmareSessions = sessions.filter(s => s.gameMode === 'nightmare');
      return nightmareSessions.some(s => s.score >= 1000000);
    },
    getProgress: (stats, sessions) => {
      const nightmareSessions = sessions.filter(s => s.gameMode === 'nightmare');
      const bestNightmare = nightmareSessions.length > 0
        ? Math.max(...nightmareSessions.map(s => s.score))
        : 0;
      return {
        current: Math.min(bestNightmare, 1000000),
        target: 1000000,
      };
    },
  },
  
  // Consistency Achievements
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
    id: 'games_100',
    title: 'Veteran',
    description: 'Play 100 games.',
    category: 'consistency',
    icon: '🎖️',
    rarity: 'rare',
    target: 100,
    checkCondition: (stats) => stats.totalGames >= 100,
    getProgress: (stats) => ({
      current: Math.min(stats.totalGames, 100),
      target: 100,
    }),
  },
  {
    id: 'games_500',
    title: 'Dedicated',
    description: 'Play 500 games.',
    category: 'consistency',
    icon: '🏆',
    rarity: 'epic',
    target: 500,
    checkCondition: (stats) => stats.totalGames >= 500,
    getProgress: (stats) => ({
      current: Math.min(stats.totalGames, 500),
      target: 500,
    }),
  },
  {
    id: 'playtime_hour',
    title: 'Marathon Player',
    description: 'Accumulate 1 hour of total playtime.',
    category: 'consistency',
    icon: '⏱️',
    rarity: 'rare',
    target: 3600000, // 1 hour in milliseconds
    checkCondition: (stats) => stats.totalPlaytime >= 3600000,
    getProgress: (stats) => ({
      current: Math.min(stats.totalPlaytime, 3600000),
      target: 3600000,
    }),
  },
  
  // Special Achievements
  {
    id: 'hard_90s',
    title: 'Hard Endurance',
    description: 'Survive for 90 seconds on Hard difficulty.',
    category: 'special',
    icon: '💪',
    rarity: 'epic',
    target: 90,
    difficulty: 'hard',
    checkCondition: (stats, sessions) => {
      const hardRuns = sessions.filter(s => s.difficulty === 'hard');
      return hardRuns.some(s => Math.floor(s.duration / 1000) >= 90);
    },
    getProgress: (stats, sessions) => {
      const hardRuns = sessions.filter(s => s.difficulty === 'hard');
      const longestHard = hardRuns.length > 0
        ? Math.max(...hardRuns.map(s => Math.floor(s.duration / 1000)))
        : 0;
      return {
        current: Math.min(longestHard, 90),
        target: 90,
      };
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
    checkCondition: (stats, sessions) => {
      const modesPlayed = new Set(sessions.map(s => s.gameMode).filter(Boolean));
      return modesPlayed.size >= 4;
    },
    getProgress: (stats, sessions) => {
      const modesPlayed = new Set(sessions.map(s => s.gameMode).filter(Boolean));
      return {
        current: Math.min(modesPlayed.size, 4),
        target: 4,
      };
    },
  },
];

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

