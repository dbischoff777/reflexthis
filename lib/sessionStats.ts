/**
 * Session statistics tracking for ReflexThis
 */

export interface GameSession {
  id: string;
  score: number;
  bestCombo: number;
  averageReactionTime: number | null;
  fastestReactionTime: number | null;
  totalPresses: number;
  difficulty: string;
  timestamp: number; // Unix timestamp in milliseconds
  duration: number; // Game duration in milliseconds
}

export interface SessionStatistics {
  totalGames: number;
  totalPlaytime: number; // Total playtime in milliseconds
  bestScore: number;
  bestCombo: number;
  averageScore: number;
  averageReactionTime: number | null;
  fastestReactionTime: number | null;
  gamesPlayedToday: number;
  recentGames: GameSession[]; // Last 10 games
}

const STORAGE_KEY = 'reflexthis_sessionStats';

/**
 * Save a game session to localStorage
 */
export function saveGameSession(session: GameSession): void {
  if (typeof window === 'undefined') return;

  try {
    const sessionsJson = localStorage.getItem(STORAGE_KEY);
    const sessions: GameSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];
    
    // Add new session
    sessions.push(session);
    
    // Keep only last 100 games to prevent localStorage bloat
    const recentSessions = sessions.slice(-100);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSessions));
  } catch (error) {
    console.error('Error saving game session:', error);
  }
}

/**
 * Get all game sessions from localStorage
 */
export function getGameSessions(): GameSession[] {
  if (typeof window === 'undefined') return [];

  try {
    const sessionsJson = localStorage.getItem(STORAGE_KEY);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error reading game sessions:', error);
    return [];
  }
}

/**
 * Calculate session statistics from a provided list of game sessions
 */
export function calculateSessionStatisticsFromSessions(
  sessions: GameSession[]
): SessionStatistics {
  if (sessions.length === 0) {
    return {
      totalGames: 0,
      totalPlaytime: 0,
      bestScore: 0,
      bestCombo: 0,
      averageScore: 0,
      averageReactionTime: null,
      fastestReactionTime: null,
      gamesPlayedToday: 0,
      recentGames: [],
    };
  }

  // Calculate totals
  const totalGames = sessions.length;
  const totalPlaytime = sessions.reduce((sum, session) => sum + session.duration, 0);
  const bestScore = Math.max(...sessions.map(s => s.score));
  const bestCombo = Math.max(...sessions.map(s => s.bestCombo));
  const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / totalGames;
  
  // Calculate reaction time stats
  const reactionTimes = sessions
    .map(s => s.fastestReactionTime)
    .filter((time): time is number => time !== null);
  
  const averageReactionTime = reactionTimes.length > 0
    ? reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length
    : null;
  
  const fastestReactionTime = reactionTimes.length > 0
    ? Math.min(...reactionTimes)
    : null;

  // Count games played today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  
  const gamesPlayedToday = sessions.filter(
    session => session.timestamp >= todayTimestamp
  ).length;

  // Get recent games (last 10)
  const recentGames = sessions
    .slice(-10)
    .reverse(); // Most recent first

  return {
    totalGames,
    totalPlaytime,
    bestScore,
    bestCombo,
    averageScore,
    averageReactionTime,
    fastestReactionTime,
    gamesPlayedToday,
    recentGames,
  };
}

/**
 * Calculate session statistics from all game sessions
 */
export function calculateSessionStatistics(): SessionStatistics {
  const sessions = getGameSessions();
  return calculateSessionStatisticsFromSessions(sessions);
}

/**
 * Clear all session statistics
 */
export function clearSessionStatistics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Format playtime duration to human-readable string
 */
export function formatPlaytime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

