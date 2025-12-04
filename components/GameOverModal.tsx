'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

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
  const { language } = useGameState();
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
          'relative w-full max-w-2xl border-4 p-6 sm:p-8',
          'pixel-border',
          'shadow-[0_0_20px_rgba(62,124,172,0.4)]',
          'animate-[fadeIn_0.3s_ease-out,scaleIn_0.3s_ease-out]'
        )}
        style={{
          borderColor: '#3E7CAC',
          backgroundColor: '#003A63',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
            <h2
            className={cn(
              'text-3xl sm:text-4xl font-bold text-foreground text-glow mb-2',
              isNewHighScore && 'animate-glitch'
            )}
          >
            {t(language, 'gameover.title')}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t(language, 'gameover.subtitle')}
          </p>
        </div>

        {/* Main content: score + details side-by-side on wide screens */}
        <div className="mb-6 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] items-start">
          {/* Score Display */}
          <div className="text-center py-6 border-y md:border md:rounded-lg md:px-4" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.6)' }}>
            <p className="text-sm text-muted-foreground mb-2">{t(language, 'gameover.finalScore')}</p>
            <p
              className={cn(
                'text-5xl sm:text-6xl font-bold text-foreground text-glow mb-4 transition-all duration-75',
                isCounting && 'scale-110'
              )}
            >
              {displayedScore.toLocaleString()}
            </p>

            {/* High Score Indicator */}
            {isNewHighScore && (
              <div
                className={cn(
                  'mt-4 p-3 border-4 pixel-border',
                  'animate-[pulse_1s_ease-in-out_infinite]'
                )}
                style={{ backgroundColor: 'rgba(62, 124, 172, 0.3)', borderColor: '#3E7CAC' }}
              >
                <p className="text-foreground font-bold text-lg text-glow">
                  {t(language, 'gameover.newHighScore')}
                </p>
              </div>
            )}

            {!isNewHighScore && highScore > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">{t(language, 'gameover.highScore')}</p>
                <p className="text-xl font-semibold text-foreground">{highScore}</p>
              </div>
            )}

            {metaSummary.rankName && (
              <div className="mt-4 text-xs text-foreground/80">
                <p className="font-semibold text-foreground">
                  {t(language, 'gameover.currentRank')} {metaSummary.rankName}
                </p>
                {metaSummary.nextRank && (
                  <p className="mt-0.5 text-[11px] text-foreground/70">
                    {t(language, 'gameover.nextRank')} <span className="font-semibold">{metaSummary.nextRank}</span>.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right column: stats, coaching tip, achievements */}
          <div className="space-y-4">
            {(bestCombo > 0 || reactionTimeStats.allTimes.length > 0) && (
              <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{t(language, 'gameover.stats.title')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {bestCombo > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t(language, 'gameover.stats.bestCombo')}</p>
                      <p className="text-lg font-bold text-foreground">{bestCombo}x</p>
                    </div>
                  )}
                  {reactionTimeStats.average !== null && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t(language, 'gameover.stats.avgReaction')}</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.round(reactionTimeStats.average)}ms
                      </p>
                    </div>
                  )}
                  {reactionTimeStats.fastest !== null && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t(language, 'gameover.stats.fastest')}</p>
                      <p className="text-lg font-bold text-chart-3">
                        {Math.round(reactionTimeStats.fastest)}ms
                      </p>
                    </div>
                  )}
                  {reactionTimeStats.allTimes.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t(language, 'gameover.stats.totalPresses')}</p>
                      <p className="text-lg font-bold text-foreground">
                        {reactionTimeStats.allTimes.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {coachingTip && (
              <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.5)', borderColor: '#3E7CAC' }}>
                <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  {t(language, 'gameover.coach.title')}
                </h3>
                <p className="text-xs text-foreground/80">{coachingTip}</p>
              </div>
            )}

            {newAchievements.length > 0 && (
              <div className="p-4 bg-chart-3/10 border-2 border-chart-3 pixel-border">
                <h3 className="text-xs font-semibold text-chart-3 mb-2 uppercase tracking-wide">
                  {t(language, 'gameover.achievements.title')}
                </h3>
                <ul className="space-y-1 text-xs text-foreground/90">
                  {newAchievements.map((a) => (
                    <li key={a.id}>
                      <span className="font-semibold text-chart-3">
                        {(() => {
                          const key = `achievement.${a.id}.title`;
                          const translated = t(language, key);
                          return translated === key ? a.title : translated;
                        })()}
                      </span>
                      <span className="text-foreground/70">
                        {' '}
                        –{' '}
                        {(() => {
                          const key = `achievement.${a.id}.description`;
                          const translated = t(language, key);
                          return translated === key ? a.description : translated;
                        })()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
            <button
            onClick={onRestart}
            draggable={false}
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-lg',
              'transition-all duration-100 active:scale-95',
              'focus:outline-none focus:ring-2 pixel-border'
            )}
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
            {t(language, 'gameover.playAgain')}
          </button>

          <Link
            href="/"
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-base text-center',
              'text-foreground transition-all duration-100',
              'focus:outline-none focus:ring-2 pixel-border'
            )}
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: 'rgba(0, 58, 99, 0.6)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)';
              e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3E7CAC';
              e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
            }}
          >
            {t(language, 'gameover.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

