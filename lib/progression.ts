import { type SessionStatistics, type GameSession, getGameSessions } from '@/lib/sessionStats';
import { getAchievementProgress, type AchievementCategory } from '@/lib/achievements';

export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  current: number;
  target: number;
  category: AchievementCategory;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface RankProgress {
  name: string;
  minScore: number;
  nextName?: string;
  nextMinScore?: number;
}

export interface MetaProgression {
  achievements: AchievementProgress[];
  rank: RankProgress | null;
  recommendation: string | null;
}

// Simple rank tiers based on best score across all sessions
const RANK_TIERS = [
  { name: 'Rookie', minScore: 0 },
  { name: 'Apprentice', minScore: 150 },
  { name: 'Skilled', minScore: 350 },
  { name: 'Expert', minScore: 700 },
  { name: 'Master', minScore: 1200 },
];

function computeRank(stats: SessionStatistics): RankProgress | null {
  const bestScore = stats.bestScore ?? 0;
  if (bestScore <= 0) {
    return {
      name: 'Rookie',
      minScore: 0,
      nextName: 'Apprentice',
      nextMinScore: RANK_TIERS[1].minScore,
    };
  }

  let current = RANK_TIERS[0];
  let next: { name: string; minScore: number } | undefined;

  for (let i = 0; i < RANK_TIERS.length; i++) {
    const tier = RANK_TIERS[i];
    const nextTier = RANK_TIERS[i + 1];

    if (bestScore >= tier.minScore) {
      current = tier;
      next = nextTier;
    }
  }

  return {
    name: current.name,
    minScore: current.minScore,
    nextName: next?.name,
    nextMinScore: next?.minScore,
  };
}

function computeAchievements(
  stats: SessionStatistics,
  sessions: GameSession[]
): AchievementProgress[] {
  // Use the new achievement system
  const achievementProgress = getAchievementProgress(stats, sessions);
  
  return achievementProgress.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    achieved: a.unlocked,
    current: a.progress.current,
    target: a.progress.target,
    category: a.category,
    icon: a.icon,
    rarity: a.rarity,
  }));
}

function computeRecommendation(
  stats: SessionStatistics,
  sessions: GameSession[]
): string | null {
  if (stats.totalGames === 0 || sessions.length === 0) {
    return 'Play a few runs to unlock personalized recommendations.';
  }

  const lastGame = sessions[sessions.length - 1];
  const lastDifficulty = lastGame.difficulty;
  const lastScore = lastGame.score;

  // Difficulty progression based on last game and best score
  if (lastDifficulty === 'easy' && lastScore >= 200) {
    return "You're crushing Easy. Try Medium for a bigger challenge.";
  }

  if (lastDifficulty === 'medium' && lastScore >= 400) {
    return "Medium is looking good – consider switching to Hard next run.";
  }

  if (stats.bestCombo >= 20 && stats.bestScore >= 600 && lastDifficulty !== 'hard') {
    return 'Your combos and scores are strong. Hard difficulty is ready for you.';
  }

  // Endurance suggestion
  const hardRuns = sessions.filter((s) => s.difficulty === 'hard');
  if (hardRuns.length > 0) {
    const longestHardSeconds =
      Math.max(...hardRuns.map((s) => Math.floor(s.duration / 1000))) || 0;
    if (longestHardSeconds < 90) {
      return `Your longest Hard run is ${longestHardSeconds}s – aim for 90s to earn the Hard Endurance achievement.`;
    }
  }

  return 'Focus on keeping your combo alive; every extra hit dramatically boosts your score.';
}

export function getMetaProgressionFromSessions(
  stats: SessionStatistics,
  sessions: GameSession[]
): MetaProgression {
  const achievements = computeAchievements(stats, sessions);
  const rank = computeRank(stats);
  const recommendation = computeRecommendation(stats, sessions);

  return { achievements, rank, recommendation };
}

export function getMetaProgression(
  stats: SessionStatistics
): MetaProgression {
  const sessions = getGameSessions();
  return getMetaProgressionFromSessions(stats, sessions);
}

