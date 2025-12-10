/**
 * Daily and Weekly Challenge System
 * Implements deterministic challenge generation with seeds, validity windows, leaderboards, and rewards
 */

export type ChallengeType = 'daily' | 'weekly';

export interface ChallengeParameters {
  difficulty: 'easy' | 'medium' | 'hard' | 'nightmare';
  gameMode: 'reflex' | 'sequence' | 'survival' | 'nightmare' | 'oddOneOut';
  targetScore?: number;
  timeLimit?: number; // in seconds
  specialRules?: string[];
}

export interface ChallengeLeaderboardEntry {
  userId: string;
  score: number;
  reactionTime?: number;
  accuracy?: number;
  timestamp: number;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  seed: number;
  validFrom: number; // timestamp
  validUntil: number; // timestamp
  parameters: ChallengeParameters;
  leaderboard: ChallengeLeaderboardEntry[];
  rewards: {
    xp: number;
    tickets: number;
  };
}

export interface UserChallengeProgress {
  challengeId: string;
  completed: boolean;
  score?: number;
  claimed: boolean;
  completedAt?: number;
}

export interface UserChallengeStreak {
  daily: number;
  weekly: number;
  lastDailyDate: string; // YYYY-MM-DD
  lastWeeklyDate: string; // YYYY-MM-DD
  unlockedBadges: string[]; // Array of badge IDs that have been unlocked
}

export interface StreakBadge {
  id: string;
  name: string;
  description: string;
  milestone: number; // Streak milestone (e.g., 3, 7, 30)
  type: 'daily' | 'weekly';
  icon?: string; // Optional icon identifier
}

const STORAGE_KEYS = {
  CHALLENGES: 'reflexthis_challenges',
  USER_PROGRESS: 'reflexthis_challengeProgress',
  USER_STREAK: 'reflexthis_challengeStreak',
} as const;

/**
 * Streak milestone badges configuration
 */
export const STREAK_BADGES: StreakBadge[] = [
  { id: 'daily-3', name: '3 Day Streak', description: 'Complete 3 daily challenges in a row', milestone: 3, type: 'daily' },
  { id: 'daily-7', name: '7 Day Streak', description: 'Complete 7 daily challenges in a row', milestone: 7, type: 'daily' },
  { id: 'daily-14', name: '2 Week Streak', description: 'Complete 14 daily challenges in a row', milestone: 14, type: 'daily' },
  { id: 'daily-30', name: 'Monthly Master', description: 'Complete 30 daily challenges in a row', milestone: 30, type: 'daily' },
  { id: 'weekly-2', name: '2 Week Streak', description: 'Complete 2 weekly challenges in a row', milestone: 2, type: 'weekly' },
  { id: 'weekly-4', name: 'Monthly Warrior', description: 'Complete 4 weekly challenges in a row', milestone: 4, type: 'weekly' },
  { id: 'weekly-8', name: '2 Month Champion', description: 'Complete 8 weekly challenges in a row', milestone: 8, type: 'weekly' },
];

/**
 * Generate deterministic seed from input string
 */
export function generateSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate challenge parameters from seed
 */
export function generateChallengeParameters(seed: number, type: ChallengeType): ChallengeParameters {
  // Use seed to create deterministic random values
  const rng = (() => {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  })();

  const difficulties: ChallengeParameters['difficulty'][] = ['easy', 'medium', 'hard', 'nightmare'];
  const gameModes: ChallengeParameters['gameMode'][] = ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'];

  const difficulty = difficulties[Math.floor(rng() * difficulties.length)];
  const gameMode = gameModes[Math.floor(rng() * gameModes.length)];

  const parameters: ChallengeParameters = {
    difficulty,
    gameMode,
  };

  // Add optional parameters based on challenge type
  if (type === 'daily') {
    // Daily challenges are shorter
    parameters.targetScore = Math.floor(50 + rng() * 100);
  } else {
    // Weekly challenges are longer
    parameters.targetScore = Math.floor(200 + rng() * 300);
    parameters.timeLimit = Math.floor(300 + rng() * 300); // 5-10 minutes
  }

  return parameters;
}

/**
 * Generate daily challenge for a specific date
 */
export function generateDailyChallenge(date: Date = new Date()): Challenge {
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const seedInput = `${dateString}-daily`;
  const seed = generateSeed(seedInput);

  const validFrom = new Date(date);
  validFrom.setHours(0, 0, 0, 0);

  const validUntil = new Date(validFrom);
  validUntil.setDate(validUntil.getDate() + 1);

  return {
    id: `daily-${dateString}`,
    type: 'daily',
    seed,
    validFrom: validFrom.getTime(),
    validUntil: validUntil.getTime(),
    parameters: generateChallengeParameters(seed, 'daily'),
    leaderboard: [],
    rewards: {
      xp: 100,
      tickets: 1,
    },
  };
}

/**
 * Generate weekly challenge for a specific week
 */
export function generateWeeklyChallenge(date: Date = new Date()): Challenge {
  // Get Monday of the week
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const weekString = monday.toISOString().split('T')[0]; // YYYY-MM-DD of Monday
  const seedInput = `${weekString}-weekly`;
  const seed = generateSeed(seedInput);

  const validFrom = monday.getTime();
  const validUntil = new Date(monday);
  validUntil.setDate(validUntil.getDate() + 7);
  const validUntilTime = validUntil.getTime();

  return {
    id: `weekly-${weekString}`,
    type: 'weekly',
    seed,
    validFrom,
    validUntil: validUntilTime,
    parameters: generateChallengeParameters(seed, 'weekly'),
    leaderboard: [],
    rewards: {
      xp: 500,
      tickets: 5,
    },
  };
}

/**
 * Get today's daily challenge
 */
export function getTodaysChallenge(): Challenge {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  const challengeId = `daily-${dateString}`;

  // Try to load from storage
  const stored = loadChallenge(challengeId);
  if (stored && stored.validUntil > Date.now()) {
    return stored;
  }

  // Generate new challenge
  const challenge = generateDailyChallenge(today);
  saveChallenge(challenge);
  return challenge;
}

/**
 * Get this week's weekly challenge
 */
export function getThisWeeksChallenge(): Challenge {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const weekString = monday.toISOString().split('T')[0];
  const challengeId = `weekly-${weekString}`;

  // Try to load from storage
  const stored = loadChallenge(challengeId);
  if (stored && stored.validUntil > Date.now()) {
    return stored;
  }

  // Generate new challenge
  const challenge = generateWeeklyChallenge(today);
  saveChallenge(challenge);
  return challenge;
}

/**
 * Save challenge to localStorage
 */
function saveChallenge(challenge: Challenge): void {
  if (typeof window === 'undefined') return;

  try {
    const challengesJson = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challenges: Record<string, Challenge> = challengesJson ? JSON.parse(challengesJson) : {};
    challenges[challenge.id] = challenge;
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challenges));
  } catch (error) {
    console.error('Error saving challenge:', error);
  }
}

/**
 * Load challenge from localStorage
 */
export function loadChallenge(challengeId: string): Challenge | null {
  if (typeof window === 'undefined') return null;

  try {
    const challengesJson = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    if (!challengesJson) return null;

    const challenges: Record<string, Challenge> = JSON.parse(challengesJson);
    return challenges[challengeId] || null;
  } catch (error) {
    console.error('Error loading challenge:', error);
    return null;
  }
}

/**
 * Get user's challenge progress
 */
export function getUserChallengeProgress(): Record<string, UserChallengeProgress> {
  if (typeof window === 'undefined') return {};

  try {
    const progressJson = localStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
    return progressJson ? JSON.parse(progressJson) : {};
  } catch (error) {
    console.error('Error loading challenge progress:', error);
    return {};
  }
}

/**
 * Save user's challenge progress
 */
export function saveUserChallengeProgress(progress: Record<string, UserChallengeProgress>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving challenge progress:', error);
  }
}

/**
 * Get user's challenge streak
 */
export function getUserChallengeStreak(): UserChallengeStreak {
  if (typeof window === 'undefined') {
    return { daily: 0, weekly: 0, lastDailyDate: '', lastWeeklyDate: '', unlockedBadges: [] };
  }

  try {
    const streakJson = localStorage.getItem(STORAGE_KEYS.USER_STREAK);
    const defaultStreak = { daily: 0, weekly: 0, lastDailyDate: '', lastWeeklyDate: '', unlockedBadges: [] };
    const streak = streakJson ? JSON.parse(streakJson) : defaultStreak;
    // Ensure unlockedBadges exists for backward compatibility
    if (!streak.unlockedBadges) {
      streak.unlockedBadges = [];
    }
    return streak;
  } catch (error) {
    console.error('Error loading challenge streak:', error);
    return { daily: 0, weekly: 0, lastDailyDate: '', lastWeeklyDate: '', unlockedBadges: [] };
  }
}

/**
 * Update user's challenge streak
 */
export function updateUserChallengeStreak(type: ChallengeType, completed: boolean): string[] {
  if (!completed) return [];

  const streak = getUserChallengeStreak();
  const today = new Date().toISOString().split('T')[0];
  const newlyUnlockedBadges: string[] = [];

  if (type === 'daily') {
    if (streak.lastDailyDate === today) {
      // Already completed today
      return [];
    }

    if (streak.lastDailyDate && getDaysBetween(streak.lastDailyDate, today) === 1) {
      // Consecutive day
      streak.daily += 1;
    } else {
      // New streak
      streak.daily = 1;
    }

    streak.lastDailyDate = today;

    // Check for milestone badges
    const dailyBadges = STREAK_BADGES.filter(b => b.type === 'daily');
    for (const badge of dailyBadges) {
      if (streak.daily >= badge.milestone && !streak.unlockedBadges.includes(badge.id)) {
        streak.unlockedBadges.push(badge.id);
        newlyUnlockedBadges.push(badge.id);
      }
    }
  } else {
    // Weekly challenge
    const monday = new Date();
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const weekString = monday.toISOString().split('T')[0];

    if (streak.lastWeeklyDate === weekString) {
      // Already completed this week
      return [];
    }

    if (streak.lastWeeklyDate && getWeeksBetween(streak.lastWeeklyDate, weekString) === 1) {
      // Consecutive week
      streak.weekly += 1;
    } else {
      // New streak
      streak.weekly = 1;
    }

    streak.lastWeeklyDate = weekString;

    // Check for milestone badges
    const weeklyBadges = STREAK_BADGES.filter(b => b.type === 'weekly');
    for (const badge of weeklyBadges) {
      if (streak.weekly >= badge.milestone && !streak.unlockedBadges.includes(badge.id)) {
        streak.unlockedBadges.push(badge.id);
        newlyUnlockedBadges.push(badge.id);
      }
    }
  }

  // Ensure unlockedBadges array exists
  if (!streak.unlockedBadges) {
    streak.unlockedBadges = [];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_STREAK, JSON.stringify(streak));
    } catch (error) {
      console.error('Error saving challenge streak:', error);
    }
  }

  return newlyUnlockedBadges;
}

/**
 * Get days between two date strings (YYYY-MM-DD)
 */
function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get weeks between two date strings (YYYY-MM-DD of Mondays)
 */
function getWeeksBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
}

/**
 * Submit challenge result
 * @returns Array of newly unlocked badge IDs
 */
export function submitChallengeResult(
  challengeId: string,
  userId: string,
  score: number,
  metrics: {
    reactionTime?: number;
    accuracy?: number;
  }
): string[] {
  const challenge = loadChallenge(challengeId);
  if (!challenge) return [];

  // Check if challenge is still valid
  if (Date.now() > challenge.validUntil) return [];

  // Add to leaderboard
  const entry: ChallengeLeaderboardEntry = {
    userId,
    score,
    reactionTime: metrics.reactionTime,
    accuracy: metrics.accuracy,
    timestamp: Date.now(),
  };

  challenge.leaderboard.push(entry);
  challenge.leaderboard.sort((a, b) => b.score - a.score);

  // Keep only top 100 entries
  if (challenge.leaderboard.length > 100) {
    challenge.leaderboard = challenge.leaderboard.slice(0, 100);
  }

  saveChallenge(challenge);

  // Update user progress
  const progress = getUserChallengeProgress();
  progress[challengeId] = {
    challengeId,
    completed: true,
    score,
    claimed: false,
    completedAt: Date.now(),
  };
  saveUserChallengeProgress(progress);

  // Update streak and get newly unlocked badges
  const newlyUnlockedBadges = updateUserChallengeStreak(challenge.type, true);

  return newlyUnlockedBadges;
}

/**
 * Check if user has completed a challenge
 */
export function hasUserCompletedChallenge(challengeId: string): boolean {
  const progress = getUserChallengeProgress();
  return progress[challengeId]?.completed || false;
}

/**
 * Claim challenge rewards
 */
export function claimChallengeRewards(challengeId: string): boolean {
  const progress = getUserChallengeProgress();
  const userProgress = progress[challengeId];

  if (!userProgress || !userProgress.completed || userProgress.claimed) {
    return false;
  }

  userProgress.claimed = true;
  saveUserChallengeProgress(progress);

  return true;
}

/**
 * Get all streak badges
 */
export function getAllStreakBadges(): StreakBadge[] {
  return STREAK_BADGES;
}

/**
 * Get unlocked badges for user
 */
export function getUnlockedBadges(): StreakBadge[] {
  const streak = getUserChallengeStreak();
  return STREAK_BADGES.filter(badge => streak.unlockedBadges.includes(badge.id));
}

/**
 * Get badges for a specific streak type
 */
export function getBadgesForStreak(type: 'daily' | 'weekly', currentStreak: number): StreakBadge[] {
  return STREAK_BADGES.filter(badge => 
    badge.type === type && 
    currentStreak >= badge.milestone
  );
}

