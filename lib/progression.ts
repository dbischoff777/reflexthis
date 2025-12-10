/**
 * Progression system for ReflexThis
 * Handles XP calculation, level progression, and cosmetic unlocks
 */

import { DifficultyPreset, DIFFICULTY_PRESETS } from './difficulty';
import { GameMode } from './gameModes';

export interface LevelConfig {
  level: number;
  xpRequired: number;
  rewards?: LevelReward[];
}

export interface LevelReward {
  type: 'cosmetic' | 'ticket';
  cosmeticId?: string;
  amount?: number; // For tickets
}

export interface UserProgress {
  level: number;
  currentXP: number;
  totalXP: number; // Lifetime XP (not affected by level-ups)
  unlockedCosmetics: string[];
  cosmeticTickets: number;
  lastLevelUp?: number; // Timestamp of last level-up
}

export interface GameResult {
  score: number;
  accuracy: number; // 0-1
  difficulty: DifficultyPreset;
  gameMode: GameMode;
  duration: number; // milliseconds
  isChallenge?: boolean; // Whether this was a challenge completion
}

const STORAGE_KEY = 'reflexthis_progression';

/**
 * Level configuration with XP requirements
 * Uses exponential curve: XP = base * (multiplier ^ level)
 */
const LEVEL_CONFIG: LevelConfig[] = (() => {
  const configs: LevelConfig[] = [];
  const baseXP = 100;
  const multiplier = 1.15; // 15% increase per level
  
  for (let level = 1; level <= 100; level++) {
    const xpRequired = Math.floor(baseXP * Math.pow(multiplier, level - 1));
    const rewards: LevelReward[] = [];
    
    // Grant cosmetic tickets every 5 levels
    if (level % 5 === 0) {
      rewards.push({
        type: 'ticket',
        amount: Math.floor(level / 5), // 1 ticket at 5, 2 at 10, etc.
      });
    }
    
    // Grant special cosmetics at milestone levels
    if (level === 10) {
      rewards.push({ type: 'cosmetic', cosmeticId: 'theme-blue' });
    } else if (level === 25) {
      rewards.push({ type: 'cosmetic', cosmeticId: 'theme-purple' });
    } else if (level === 50) {
      rewards.push({ type: 'cosmetic', cosmeticId: 'theme-gold' });
    } else if (level === 75) {
      rewards.push({ type: 'cosmetic', cosmeticId: 'trail-sparkle' });
    } else if (level === 100) {
      rewards.push({ type: 'cosmetic', cosmeticId: 'theme-legendary' });
    }
    
    configs.push({
      level,
      xpRequired,
      rewards: rewards.length > 0 ? rewards : undefined,
    });
  }
  
  return configs;
})();

// Soft cap starts at level 50
const SOFT_CAP_LEVEL = 50;
const SOFT_CAP_MULTIPLIER = 0.5; // 50% reduction after soft cap

/**
 * Calculate XP from game result
 */
export function calculateXP(gameResult: GameResult): number {
  // Base XP from score (0.1 XP per point)
  let xp = gameResult.score * 0.1;
  
  // Accuracy bonus (0.5x to 1.5x multiplier)
  // Perfect accuracy (1.0) gives 1.5x, 0.5 accuracy gives 1.0x
  const accuracyMultiplier = 0.5 + gameResult.accuracy * 0.5;
  xp *= accuracyMultiplier;
  
  // Difficulty multiplier
  const difficultyMultipliers: Record<DifficultyPreset, number> = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.3,
    nightmare: 1.6,
  };
  xp *= difficultyMultipliers[gameResult.difficulty] || 1.0;
  
  // Game mode multiplier (some modes are harder)
  const modeMultipliers: Partial<Record<GameMode, number>> = {
    reflex: 1.0,
    sequence: 1.15,
    oddOneOut: 1.2,
  };
  xp *= modeMultipliers[gameResult.gameMode] || 1.0;
  
  // Challenge completion bonus (50% extra XP)
  if (gameResult.isChallenge) {
    xp *= 1.5;
  }
  
  // Round to integer
  return Math.max(1, Math.round(xp)); // Minimum 1 XP
}

/**
 * Apply soft cap to XP gain
 */
function applySoftCap(amount: number, currentLevel: number): number {
  if (currentLevel < SOFT_CAP_LEVEL) {
    return amount;
  }
  
  return Math.round(amount * SOFT_CAP_MULTIPLIER);
}

/**
 * Get level configuration for a specific level
 */
export function getLevelConfig(level: number): LevelConfig | null {
  return LEVEL_CONFIG.find(config => config.level === level) || null;
}

/**
 * Get all level configurations
 */
export function getAllLevelConfigs(): LevelConfig[] {
  return LEVEL_CONFIG;
}

/**
 * Load user progress from localStorage
 */
export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') {
    return getDefaultProgress();
  }

  try {
    const progressJson = localStorage.getItem(STORAGE_KEY);
    if (!progressJson) {
      return getDefaultProgress();
    }

    const progress = JSON.parse(progressJson) as UserProgress;
    // Ensure all required fields exist
    return {
      level: progress.level || 1,
      currentXP: progress.currentXP || 0,
      totalXP: progress.totalXP || 0,
      unlockedCosmetics: progress.unlockedCosmetics || [],
      cosmeticTickets: progress.cosmeticTickets || 0,
      lastLevelUp: progress.lastLevelUp,
    };
  } catch (error) {
    console.error('Error loading user progress:', error);
    return getDefaultProgress();
  }
}

/**
 * Save user progress to localStorage
 */
export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving user progress:', error);
  }
}

/**
 * Get default progress for new users
 */
function getDefaultProgress(): UserProgress {
  return {
    level: 1,
    currentXP: 0,
    totalXP: 0,
    unlockedCosmetics: [],
    cosmeticTickets: 0,
  };
}

/**
 * Add XP to user progress
 * @returns Object with level-up information if level up occurred
 */
export function addXP(amount: number, source: string): {
  leveledUp: boolean;
  newLevel?: number;
  rewards?: LevelReward[];
} {
  // Anti-abuse: Validate input
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
    console.warn('Invalid XP amount:', amount, 'from source:', source);
    return { leveledUp: false };
  }

  const progress = loadUserProgress();
  
  // Anti-abuse: Validate progress state
  if (!Number.isFinite(progress.level) || progress.level < 1 || progress.level > 100) {
    console.error('Invalid progress state detected, resetting to defaults');
    const defaultProgress = getDefaultProgress();
    saveUserProgress(defaultProgress);
    return { leveledUp: false };
  }
  
  // Apply soft cap if needed
  const effectiveAmount = applySoftCap(amount, progress.level);
  
  // Anti-abuse: Cap effective amount
  const cappedAmount = Math.min(effectiveAmount, 100000);
  
  // Add to total XP (lifetime, not affected by level-ups)
  progress.totalXP = Math.max(0, progress.totalXP + cappedAmount);
  
  // Add to current XP
  progress.currentXP = Math.max(0, progress.currentXP + cappedAmount);
  
  // Check for level-up
  const levelUpResult = checkLevelUp(progress);
  
  // Anti-abuse: Validate after level-up
  if (progress.level < 1 || progress.level > 100) {
    console.error('Invalid level after level-up, clamping');
    progress.level = Math.max(1, Math.min(100, progress.level));
  }
  
  // Save progress
  saveUserProgress(progress);
  
  return levelUpResult;
}

/**
 * Check if user should level up and handle it
 */
function checkLevelUp(progress: UserProgress): {
  leveledUp: boolean;
  newLevel?: number;
  rewards?: LevelReward[];
} {
  let leveledUp = false;
  let newLevel = progress.level;
  let allRewards: LevelReward[] = [];
  
  while (true) {
    const currentLevelConfig = getLevelConfig(progress.level);
    if (!currentLevelConfig) {
      // Max level reached
      break;
    }
    
    if (progress.currentXP < currentLevelConfig.xpRequired) {
      // Not enough XP for this level
      break;
    }
    
    // Level up!
    progress.currentXP -= currentLevelConfig.xpRequired;
    progress.level++;
    newLevel = progress.level;
    leveledUp = true;
    progress.lastLevelUp = Date.now();
    
    // Collect rewards
    if (currentLevelConfig.rewards) {
      allRewards.push(...currentLevelConfig.rewards);
      
      // Apply rewards
      for (const reward of currentLevelConfig.rewards) {
        if (reward.type === 'cosmetic' && reward.cosmeticId) {
          // Anti-abuse: Only unlock if not already unlocked
          if (!progress.unlockedCosmetics.includes(reward.cosmeticId)) {
            unlockCosmetic(reward.cosmeticId);
          }
        } else if (reward.type === 'ticket' && reward.amount) {
          // Anti-abuse: Validate ticket amount and cap
          const validAmount = Math.max(0, Math.min(1000, Math.floor(reward.amount)));
          progress.cosmeticTickets = Math.max(0, Math.min(100000, progress.cosmeticTickets + validAmount));
        }
      }
    }
  }
  
  return {
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    rewards: allRewards.length > 0 ? allRewards : undefined,
  };
}

/**
 * Unlock a cosmetic item
 * Anti-abuse: Prevents duplicate unlocks
 */
export function unlockCosmetic(cosmeticId: string): boolean {
  // Anti-abuse: Validate cosmetic ID
  if (!cosmeticId || typeof cosmeticId !== 'string' || cosmeticId.length > 100) {
    console.warn('Invalid cosmetic ID:', cosmeticId);
    return false;
  }

  const progress = loadUserProgress();
  
  // Anti-abuse: Check if already unlocked (prevents duplicate grants)
  if (progress.unlockedCosmetics.includes(cosmeticId)) {
    return false;
  }
  
  // Anti-abuse: Limit unlocked cosmetics array size
  if (progress.unlockedCosmetics.length >= 1000) {
    console.warn('Unlocked cosmetics array too large, preventing addition');
    return false;
  }
  
  // Add to unlocked list
  progress.unlockedCosmetics.push(cosmeticId);
  saveUserProgress(progress);
  
  return true;
}

/**
 * Check if a cosmetic is unlocked
 */
export function isCosmeticUnlocked(cosmeticId: string): boolean {
  const progress = loadUserProgress();
  return progress.unlockedCosmetics.includes(cosmeticId);
}

/**
 * Get user's current progress
 */
export function getUserProgress(): UserProgress {
  return loadUserProgress();
}

/**
 * Get XP required for next level
 */
export function getXPRequiredForNextLevel(): number {
  const progress = loadUserProgress();
  const nextLevelConfig = getLevelConfig(progress.level);
  return nextLevelConfig?.xpRequired || 0;
}

/**
 * Get XP progress toward next level (0-1)
 */
export function getXPProgress(): number {
  const progress = loadUserProgress();
  const currentLevelConfig = getLevelConfig(progress.level);
  if (!currentLevelConfig) {
    return 1; // Max level
  }
  
  return Math.min(1, progress.currentXP / currentLevelConfig.xpRequired);
}
