'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { ReactionTimeStats } from '@/lib/GameContext';
import {
  calculateSessionStatistics,
  calculateSessionStatisticsFromSessions,
  getGameSessions,
} from '@/lib/sessionStats';
import {
  getMetaProgression,
  getMetaProgressionFromSessions,
  type AchievementProgress,
} from '@/lib/progression';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  bestCombo: number;
  reactionTimeStats: ReactionTimeStats;
  onRestart: () => void;
}

function getCoachingTip(
  score: number,
  bestCombo: number,
  stats: ReactionTimeStats
): string | null {
  const hasStats = stats.allTimes.length > 0;

  if (!hasStats) {
    return 'Play a few longer runs to gather more data – your coach will have better tips next time.';
  }

  const { average, fastest, allTimes } = stats;

  if (average !== null && fastest !== null && average - fastest > 200) {
    return 'Your best reactions are much faster than your average. Focus on staying calm and repeating those great hits consistently.';
  }

  if (bestCombo < 5 && allTimes.length >= 15) {
    return 'Try to slow down slightly and avoid early key presses. Fewer mistakes will let your combo – and score – climb much higher.';
  }

  if (score > 0 && average !== null && average > 450) {
    return 'Work on reacting a bit earlier after each highlight appears. Aim to bring your average reaction time under 400ms.';
  }

  if (score > 0 && bestCombo >= 10) {
    return 'You can already hold strong combos. Try pushing for one or two more hits per streak to reach the next level.';
  }

  return 'Keep an eye on your combo and avoid rushed inputs. Clean, accurate hits will multiply your score quickly.';
}

/**
 * GameOverModal component - Displays game over screen with score and restart options
 */
export function GameOverModal({
  score,
  highScore,
  isNewHighScore,
  bestCombo,
  reactionTimeStats,
  onRestart,
}: GameOverModalProps) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isCounting, setIsCounting] = useState(true);
  const coachingTip = getCoachingTip(score, bestCombo, reactionTimeStats);
  const [metaSummary, setMetaSummary] = useState<{
    rankName: string | null;
    nextRank: string | null;
  }>({ rankName: null, nextRank: null });
  const [newAchievements, setNewAchievements] = useState<AchievementProgress[]>([]);

  // Animate score count-up
  useEffect(() => {
    if (score === 0) {
      setDisplayedScore(0);
      setIsCounting(false);
      return;
    }

    setIsCounting(true);
    const duration = 1500; // 1.5 seconds
    const steps = 60; // 60 animation steps
    const increment = score / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newScore = Math.min(Math.floor(increment * currentStep), score);
      setDisplayedScore(newScore);

      if (currentStep >= steps || newScore >= score) {
        setDisplayedScore(score);
        setIsCounting(false);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score]);

  // Load latest rank information and newly unlocked achievements for this Game Over screen
  useEffect(() => {
    const sessions = getGameSessions();

    // Meta after this run (all sessions)
    const statsAfter = calculateSessionStatisticsFromSessions(sessions);
    const metaAfter = getMetaProgressionFromSessions(statsAfter, sessions);

    // Meta before this run (all but last session)
    const sessionsBefore =
      sessions.length > 1 ? sessions.slice(0, -1) : [];
    const statsBefore = calculateSessionStatisticsFromSessions(sessionsBefore);
    const metaBefore = getMetaProgressionFromSessions(statsBefore, sessionsBefore);

    setMetaSummary({
      rankName: metaAfter.rank?.name ?? null,
      nextRank: metaAfter.rank?.nextName ?? null,
    });

    const unlockedBefore = new Set(
      metaBefore.achievements.filter((a) => a.achieved).map((a) => a.id)
    );
    const unlockedNow = metaAfter.achievements.filter((a) => a.achieved);
    const newlyUnlocked = unlockedNow.filter(
      (a) => !unlockedBefore.has(a.id)
    );

    setNewAchievements(newlyUnlocked);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 crt-scanlines">
      <div
        className={cn(
          'relative w-full max-w-md border-4 p-6 sm:p-8',
          'bg-card border-primary pixel-border',
          'animate-[fadeIn_0.3s_ease-out,scaleIn_0.3s_ease-out]'
        )}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className={cn(
              'text-3xl sm:text-4xl font-bold text-primary text-glow mb-2',
              isNewHighScore && 'animate-glitch'
            )}
          >
            Game Over
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your reflexes have been tested!
          </p>
        </div>

        {/* Score Display */}
        <div className="text-center py-6 mb-6 border-y border-border">
          <p className="text-sm text-muted-foreground mb-2">Final Score</p>
          <p 
            className={cn(
              'text-5xl sm:text-6xl font-bold text-primary text-glow mb-4 transition-all duration-75',
              isCounting && 'scale-110'
            )}
          >
            {displayedScore.toLocaleString()}
          </p>

          {/* High Score Indicator */}
          {isNewHighScore && (
            <div
              className={cn(
                'mt-4 p-3 bg-primary/30 border-4 border-primary pixel-border',
                'animate-[pulse_1s_ease-in-out_infinite]'
              )}
            >
              <p className="text-primary font-bold text-lg text-glow">
                🏆 New High Score! 🏆
              </p>
            </div>
          )}

          {!isNewHighScore && highScore > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">High Score</p>
              <p className="text-xl font-semibold text-primary">{highScore}</p>
            </div>
          )}

          {metaSummary.rankName && (
            <div className="mt-4 text-xs text-foreground/80">
              <p className="font-semibold text-primary">
                Current Rank: {metaSummary.rankName}
              </p>
              {metaSummary.nextRank && (
                <p className="mt-0.5 text-[11px] text-foreground/70">
                  Keep pushing to reach <span className="font-semibold">{metaSummary.nextRank}</span>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {(bestCombo > 0 || reactionTimeStats.allTimes.length > 0) && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-card border-4 border-border pixel-border">
              <h3 className="text-sm font-semibold text-primary mb-3">Game Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {bestCombo > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Best Combo</p>
                    <p className="text-lg font-bold text-accent">{bestCombo}x</p>
                  </div>
                )}
                {reactionTimeStats.average !== null && (
                  <div>
                    <p className="text-muted-foreground mb-1">Avg Reaction</p>
                    <p className="text-lg font-bold text-primary">
                      {Math.round(reactionTimeStats.average)}ms
                    </p>
                  </div>
                )}
                {reactionTimeStats.fastest !== null && (
                  <div>
                    <p className="text-muted-foreground mb-1">Fastest</p>
                    <p className="text-lg font-bold text-green-400">
                      {Math.round(reactionTimeStats.fastest)}ms
                    </p>
                  </div>
                )}
                {reactionTimeStats.allTimes.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Total Presses</p>
                    <p className="text-lg font-bold text-primary">
                      {reactionTimeStats.allTimes.length}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {coachingTip && (
              <div className="p-4 bg-card/80 border-2 border-primary pixel-border">
                <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                  Coach&apos;s Tip
                </h3>
                <p className="text-xs text-foreground/80">{coachingTip}</p>
              </div>
            )}

            {newAchievements.length > 0 && (
              <div className="p-4 bg-chart-3/10 border-2 border-chart-3 pixel-border">
                <h3 className="text-xs font-semibold text-chart-3 mb-2 uppercase tracking-wide">
                  New Achievements
                </h3>
                <ul className="space-y-1 text-xs text-foreground/90">
                  {newAchievements.map((a) => (
                    <li key={a.id}>
                      <span className="font-semibold text-chart-3">
                        {a.title}
                      </span>
                      <span className="text-foreground/70"> – {a.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            draggable={false}
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-lg',
              'bg-primary border-primary text-primary-foreground',
              'hover:border-accent hover:bg-accent',
              'transition-all duration-100 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary pixel-border'
            )}
          >
            Play Again
          </button>

          <Link
            href="/"
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-base text-center',
              'border-border bg-card text-foreground',
              'hover:border-primary hover:bg-primary/20',
              'transition-all duration-100',
              'focus:outline-none focus:ring-2 focus:ring-primary pixel-border'
            )}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

