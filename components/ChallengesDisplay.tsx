'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import {
  Challenge,
  getTodaysChallenge,
  getThisWeeksChallenge,
  hasUserCompletedChallenge,
  claimChallengeRewards,
  getUserChallengeStreak,
  getBadgesForStreak,
  getAllStreakBadges,
  type ChallengeType,
  type StreakBadge,
} from '@/lib/challenges';
import { cn } from '@/lib/utils';

interface ChallengesDisplayProps {
  onStartChallenge?: (challengeId: string) => void;
}

/**
 * ChallengesDisplay - Shows daily and weekly challenges with leaderboards
 */
export function ChallengesDisplay({ onStartChallenge }: ChallengesDisplayProps) {
  const router = useRouter();
  const { language, setGameMode, setDifficulty } = useGameState();
  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState<Challenge | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [weeklyCompleted, setWeeklyCompleted] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [weeklyClaimed, setWeeklyClaimed] = useState(false);
  const [streak, setStreak] = useState({ daily: 0, weekly: 0, unlockedBadges: [] as string[] });
  const [unlockedDailyBadges, setUnlockedDailyBadges] = useState<StreakBadge[]>([]);
  const [unlockedWeeklyBadges, setUnlockedWeeklyBadges] = useState<StreakBadge[]>([]);

  useEffect(() => {
    // Load challenges
    const daily = getTodaysChallenge();
    const weekly = getThisWeeksChallenge();
    setDailyChallenge(daily);
    setWeeklyChallenge(weekly);

    // Check completion status
    setDailyCompleted(hasUserCompletedChallenge(daily.id));
    setWeeklyCompleted(hasUserCompletedChallenge(weekly.id));

    // Check claimed status (would need to be stored separately)
    // For now, we'll check if completed and assume not claimed if we can't verify

    // Load streak
    const userStreak = getUserChallengeStreak();
    setStreak(userStreak);
    
    // Load unlocked badges
    const dailyBadges = getBadgesForStreak('daily', userStreak.daily);
    const weeklyBadges = getBadgesForStreak('weekly', userStreak.weekly);
    setUnlockedDailyBadges(dailyBadges);
    setUnlockedWeeklyBadges(weeklyBadges);
  }, []);

  const handleClaim = (challengeId: string, type: ChallengeType) => {
    if (claimChallengeRewards(challengeId)) {
      if (type === 'daily') {
        setDailyClaimed(true);
      } else {
        setWeeklyClaimed(true);
      }
    }
  };

  const handleStartChallenge = (challenge: Challenge) => {
    // Set game mode and difficulty from challenge
    setGameMode(challenge.parameters.gameMode);
    setDifficulty(challenge.parameters.difficulty);
    
    // Store challenge ID in sessionStorage for game page to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('reflexthis_activeChallenge', JSON.stringify({
        id: challenge.id,
        type: challenge.type,
      }));
    }
    
    // Navigate to game page
    router.push('/game');
    
    // Call optional callback if provided
    onStartChallenge?.(challenge.id);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeRemaining = (validUntil: number) => {
    const now = Date.now();
    const remaining = validUntil - now;
    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} left`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Streak Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Daily Streak</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{streak.daily}</p>
        </div>
        <div className="p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Weekly Streak</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{streak.weekly}</p>
        </div>
      </div>

      {/* Streak Badges */}
      {(unlockedDailyBadges.length > 0 || unlockedWeeklyBadges.length > 0) && (
        <div className="mb-6">
          <h4 className="text-sm sm:text-base font-semibold text-foreground mb-3">Unlocked Badges</h4>
          <div className="space-y-3">
            {unlockedDailyBadges.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Daily Challenges</p>
                <div className="flex flex-wrap gap-2">
                  {unlockedDailyBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="px-3 py-2 border-2 pixel-border text-xs sm:text-sm"
                      style={{
                        backgroundColor: 'rgba(62, 124, 172, 0.3)',
                        borderColor: '#3E7CAC',
                      }}
                      title={badge.description}
                    >
                      <div className="font-semibold text-foreground">{badge.name}</div>
                      <div className="text-muted-foreground">{badge.milestone} days</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unlockedWeeklyBadges.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Weekly Challenges</p>
                <div className="flex flex-wrap gap-2">
                  {unlockedWeeklyBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="px-3 py-2 border-2 pixel-border text-xs sm:text-sm"
                      style={{
                        backgroundColor: 'rgba(62, 124, 172, 0.3)',
                        borderColor: '#3E7CAC',
                      }}
                      title={badge.description}
                    >
                      <div className="font-semibold text-foreground">{badge.name}</div>
                      <div className="text-muted-foreground">{badge.milestone} weeks</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Milestone Preview */}
      <div className="mb-6 p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.4)', borderColor: '#3E7CAC' }}>
        <p className="text-xs sm:text-sm font-semibold text-foreground mb-2">Next Milestones</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          {(() => {
            const allBadges = getAllStreakBadges();
            const nextDaily = allBadges
              .filter(b => b.type === 'daily' && b.milestone > streak.daily)
              .sort((a, b) => a.milestone - b.milestone)[0];
            const nextWeekly = allBadges
              .filter(b => b.type === 'weekly' && b.milestone > streak.weekly)
              .sort((a, b) => a.milestone - b.milestone)[0];
            
            return (
              <>
                {nextDaily && (
                  <div>
                    Daily: {nextDaily.milestone - streak.daily} more day{nextDaily.milestone - streak.daily !== 1 ? 's' : ''} until "{nextDaily.name}"
                  </div>
                )}
                {nextWeekly && (
                  <div>
                    Weekly: {nextWeekly.milestone - streak.weekly} more week{nextWeekly.milestone - streak.weekly !== 1 ? 's' : ''} until "{nextWeekly.name}"
                  </div>
                )}
                {!nextDaily && !nextWeekly && (
                  <div className="text-foreground font-semibold">All milestones achieved! 🎉</div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <div className="border-4 pixel-border p-4 space-y-3" style={{ backgroundColor: 'rgba(0, 58, 99, 0.8)', borderColor: '#3E7CAC' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">Today's Challenge</h3>
            <span className="text-xs sm:text-sm text-muted-foreground">{formatTimeRemaining(dailyChallenge.validUntil)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-semibold text-foreground">{dailyChallenge.parameters.gameMode}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Difficulty:</span>
              <span className="font-semibold text-foreground capitalize">{dailyChallenge.parameters.difficulty}</span>
            </div>

            {dailyChallenge.parameters.targetScore && (
              <div className="text-sm">
                <span className="text-muted-foreground">Target Score: </span>
                <span className="font-semibold text-foreground">{dailyChallenge.parameters.targetScore}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Rewards: </span>
                <span className="font-semibold text-foreground">+{dailyChallenge.rewards.xp} XP</span>
                <span className="text-muted-foreground">, </span>
                <span className="font-semibold text-foreground">{dailyChallenge.rewards.tickets} Ticket{dailyChallenge.rewards.tickets !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {dailyCompleted ? (
              dailyClaimed ? (
                <div className="px-4 py-2 border-2 pixel-border text-sm font-semibold" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(62, 124, 172, 0.2)' }}>
                  Rewards Claimed
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(dailyChallenge.id, 'daily')}
                  className="px-4 py-2 border-2 pixel-border text-sm font-semibold transition-all duration-200"
                  style={{
                    borderColor: '#3E7CAC',
                    backgroundColor: '#3E7CAC',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3E7CAC';
                  }}
                >
                  Claim Rewards
                </button>
              )
            ) : (
              <button
                onClick={() => handleStartChallenge(dailyChallenge)}
                className="px-4 py-2 border-2 pixel-border text-sm font-semibold transition-all duration-200"
                style={{
                  borderColor: '#3E7CAC',
                  backgroundColor: '#3E7CAC',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3E7CAC';
                }}
              >
                Start Challenge
              </button>
            )}
          </div>

          {/* Leaderboard Preview */}
          {dailyChallenge.leaderboard.length > 0 && (
            <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#3E7CAC' }}>
              <p className="text-xs sm:text-sm font-semibold text-foreground mb-2">Top Scores</p>
              <div className="space-y-1">
                {dailyChallenge.leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="text-foreground">{entry.score}</span>
                    {entry.reactionTime && (
                      <span className="text-muted-foreground">{entry.reactionTime.toFixed(0)}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Challenge */}
      {weeklyChallenge && (
        <div className="border-4 pixel-border p-4 space-y-3" style={{ backgroundColor: 'rgba(0, 58, 99, 0.8)', borderColor: '#3E7CAC' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">Weekly Challenge</h3>
            <span className="text-xs sm:text-sm text-muted-foreground">{formatTimeRemaining(weeklyChallenge.validUntil)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-semibold text-foreground">{weeklyChallenge.parameters.gameMode}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Difficulty:</span>
              <span className="font-semibold text-foreground capitalize">{weeklyChallenge.parameters.difficulty}</span>
            </div>

            {weeklyChallenge.parameters.targetScore && (
              <div className="text-sm">
                <span className="text-muted-foreground">Target Score: </span>
                <span className="font-semibold text-foreground">{weeklyChallenge.parameters.targetScore}</span>
              </div>
            )}

            {weeklyChallenge.parameters.timeLimit && (
              <div className="text-sm">
                <span className="text-muted-foreground">Time Limit: </span>
                <span className="font-semibold text-foreground">{Math.floor(weeklyChallenge.parameters.timeLimit / 60)} minutes</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Rewards: </span>
                <span className="font-semibold text-foreground">+{weeklyChallenge.rewards.xp} XP</span>
                <span className="text-muted-foreground">, </span>
                <span className="font-semibold text-foreground">{weeklyChallenge.rewards.tickets} Tickets</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {weeklyCompleted ? (
              weeklyClaimed ? (
                <div className="px-4 py-2 border-2 pixel-border text-sm font-semibold" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(62, 124, 172, 0.2)' }}>
                  Rewards Claimed
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(weeklyChallenge.id, 'weekly')}
                  className="px-4 py-2 border-2 pixel-border text-sm font-semibold transition-all duration-200"
                  style={{
                    borderColor: '#3E7CAC',
                    backgroundColor: '#3E7CAC',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3E7CAC';
                  }}
                >
                  Claim Rewards
                </button>
              )
            ) : (
              <button
                onClick={() => handleStartChallenge(weeklyChallenge)}
                className="px-4 py-2 border-2 pixel-border text-sm font-semibold transition-all duration-200"
                style={{
                  borderColor: '#3E7CAC',
                  backgroundColor: '#3E7CAC',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3E7CAC';
                }}
              >
                Start Challenge
              </button>
            )}
          </div>

          {/* Leaderboard Preview */}
          {weeklyChallenge.leaderboard.length > 0 && (
            <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#3E7CAC' }}>
              <p className="text-xs sm:text-sm font-semibold text-foreground mb-2">Top Scores</p>
              <div className="space-y-1">
                {weeklyChallenge.leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="text-foreground">{entry.score}</span>
                    {entry.reactionTime && (
                      <span className="text-muted-foreground">{entry.reactionTime.toFixed(0)}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

