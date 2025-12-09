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
  type GameSession,
} from '@/lib/sessionStats';
import {
  getMetaProgression,
  getMetaProgressionFromSessions,
  type AchievementProgress,
} from '@/lib/progression';
import { ReactionTimeGraph } from '@/components/ReactionTimeGraph';
import { GameMode } from '@/lib/gameModes';
import { DifficultyPreset } from '@/lib/difficulty';
import { getAchievementById } from '@/lib/achievements';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  bestCombo: number;
  reactionTimeStats: ReactionTimeStats;
  onRestart: () => void;
  gameMode?: GameMode;
  difficulty?: DifficultyPreset;
  newlyUnlockedAchievementIds?: string[];
}

function getCoachingTip(
  score: number,
  bestCombo: number,
  stats: ReactionTimeStats,
  language: 'en' | 'de'
): string | null {
  const hasStats = stats.allTimes.length > 0;

  if (!hasStats) {
    return t(language, 'gameover.coach.noData');
  }

  const { average, fastest, allTimes } = stats;

  if (average !== null && fastest !== null && average - fastest > 200) {
    return t(language, 'gameover.coach.fastVsAverage');
  }

  if (bestCombo < 5 && allTimes.length >= 15) {
    return t(language, 'gameover.coach.lowCombo');
  }

  if (score > 0 && average !== null && average > 450) {
    return t(language, 'gameover.coach.slowReaction');
  }

  if (score > 0 && bestCombo >= 10) {
    return t(language, 'gameover.coach.goodCombo');
  }

  return t(language, 'gameover.coach.default');
}

/**
 * GameOverModal component - Displays game over screen with score and restart options
 */
type TabType = 'overview' | 'details' | 'achievements';

export function GameOverModal({
  score,
  highScore,
  isNewHighScore,
  bestCombo,
  reactionTimeStats,
  onRestart,
  gameMode,
  difficulty,
  newlyUnlockedAchievementIds = [],
}: GameOverModalProps) {
  const { language } = useGameState();
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isCounting, setIsCounting] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const coachingTip = getCoachingTip(score, bestCombo, reactionTimeStats, language);
  const [metaSummary, setMetaSummary] = useState<{
    rankName: string | null;
    nextRank: string | null;
  }>({ rankName: null, nextRank: null });
  const [newAchievements, setNewAchievements] = useState<AchievementProgress[]>([]);
  const [previousBest, setPreviousBest] = useState<{
    score: number;
    bestCombo: number;
    averageReaction: number | null;
    fastestReaction: number | null;
  } | null>(null);
  const [gameDuration, setGameDuration] = useState(0);

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

  // Load latest rank information, newly unlocked achievements, and previous best
  useEffect(() => {
    const sessions = getGameSessions();

    // Get current game session (most recent)
    const currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    if (currentSession) {
      setGameDuration(currentSession.duration);
    }

    // Meta after this run (all sessions)
    const statsAfter = calculateSessionStatisticsFromSessions(sessions);
    const metaAfter = getMetaProgressionFromSessions(statsAfter, sessions);

    setMetaSummary({
      rankName: metaAfter.rank?.name ?? null,
      nextRank: metaAfter.rank?.nextName ?? null,
    });

    // Use newly unlocked achievements from props if available, otherwise fall back to calculation
    if (newlyUnlockedAchievementIds.length > 0) {
      // Convert achievement IDs to AchievementProgress objects
      const sessionsForProgress = getGameSessions();
      const statsForProgress = calculateSessionStatisticsFromSessions(sessionsForProgress);
      const metaForProgress = getMetaProgressionFromSessions(statsForProgress, sessionsForProgress);
      
      // Create a map of achievement IDs to their progress data
      const achievementMap = new Map(
        metaForProgress.achievements.map(a => [a.id, a])
      );
      
      // Convert IDs to AchievementProgress objects
      const convertedAchievements = newlyUnlockedAchievementIds
        .map(id => {
          const progress = achievementMap.get(id);
          if (progress) return progress;
          
          // Fallback: get achievement data directly if not in progress map
          const achievement = getAchievementById(id);
          if (achievement) {
            return {
              id: achievement.id,
              title: achievement.title,
              description: achievement.description,
              achieved: true,
              current: achievement.target,
              target: achievement.target,
              category: achievement.category,
              icon: achievement.icon,
              rarity: achievement.rarity,
            };
          }
          return null;
        })
        .filter((a): a is AchievementProgress => a !== null);
      
      setNewAchievements(convertedAchievements);
    } else {
      // Fallback: calculate newly unlocked achievements by comparing before/after
      const sessionsBefore = sessions.length > 1 ? sessions.slice(0, -1) : [];
      const statsBefore = calculateSessionStatisticsFromSessions(sessionsBefore);
      const metaBefore = getMetaProgressionFromSessions(statsBefore, sessionsBefore);

      const unlockedBefore = new Set(
        metaBefore.achievements.filter((a) => a.achieved).map((a) => a.id)
      );
      const unlockedNow = metaAfter.achievements.filter((a) => a.achieved);
      const newlyUnlocked = unlockedNow.filter(
        (a) => !unlockedBefore.has(a.id)
      );

      setNewAchievements(newlyUnlocked);
    }

    // Find previous best performance (excluding current session)
    const sessionsBefore = sessions.length > 1 ? sessions.slice(0, -1) : [];
    if (sessionsBefore.length > 0) {
      const bestSession = sessionsBefore.reduce((best, session) => {
        if (session.score > best.score) return session;
        if (session.score === best.score && (session.bestCombo || 0) > (best.bestCombo || 0)) return session;
        return best;
      }, sessionsBefore[0]);

      setPreviousBest({
        score: bestSession.score,
        bestCombo: bestSession.bestCombo || 0,
        averageReaction: bestSession.averageReactionTime,
        fastestReaction: bestSession.fastestReactionTime,
      });
    }
  }, [newlyUnlockedAchievementIds]);


  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-3">
      {/* Top row: Score + Stats side by side */}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {/* Score Display */}
        <div className="text-center py-4 border-4 pixel-border" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.6)' }}>
          <p className="text-base sm:text-lg text-muted-foreground mb-2">{t(language, 'gameover.finalScore')}</p>
          <p
            className={cn(
              'text-5xl sm:text-6xl md:text-7xl font-bold text-foreground text-glow mb-3 transition-all duration-75',
              isCounting && 'scale-110'
            )}
          >
            {displayedScore.toLocaleString()}
          </p>

          {/* High Score Indicator */}
          {isNewHighScore && (
            <div
              className={cn(
                'mt-2 p-3 border-4 pixel-border',
                'animate-[pulse_1s_ease-in-out_infinite]'
              )}
              style={{ backgroundColor: 'rgba(62, 124, 172, 0.3)', borderColor: '#3E7CAC' }}
            >
              <p className="text-foreground font-bold text-base sm:text-lg text-glow">
                {t(language, 'gameover.newHighScore')}
              </p>
            </div>
          )}

          {!isNewHighScore && highScore > 0 && (
            <div className="mt-2">
              <p className="text-base sm:text-lg text-muted-foreground">{t(language, 'gameover.highScore')}</p>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground">{highScore.toLocaleString()}</p>
            </div>
          )}

          {metaSummary.rankName && (
            <div className="mt-3 text-base sm:text-lg text-foreground/80">
              <p className="font-semibold text-foreground">
                {t(language, 'gameover.currentRank')} {metaSummary.rankName}
              </p>
              {metaSummary.nextRank && (
                <p className="mt-1 text-base text-foreground/70">
                  {t(language, 'gameover.nextRank')} <span className="font-semibold">{metaSummary.nextRank}</span>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {(bestCombo > 0 || reactionTimeStats.allTimes.length > 0) && (
          <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">{t(language, 'gameover.stats.title')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {bestCombo > 0 && (
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.stats.bestCombo')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{bestCombo}x</p>
              </div>
            )}
            {reactionTimeStats.average !== null && (
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.stats.avgReaction')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {Math.round(reactionTimeStats.average)}ms
                </p>
              </div>
            )}
            {reactionTimeStats.fastest !== null && (
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.stats.fastest')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-chart-3">
                  {Math.round(reactionTimeStats.fastest)}ms
                </p>
              </div>
            )}
            {reactionTimeStats.allTimes.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.stats.totalPresses')}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {reactionTimeStats.allTimes.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Comparison + Coaching side by side */}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {/* Comparison to Previous Best */}
        {previousBest && (
          <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">{t(language, 'gameover.comparison.title')}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.comparison.score')}</p>
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-xl sm:text-2xl font-bold',
                    score > previousBest.score ? 'text-chart-3' : score < previousBest.score ? 'text-chart-5' : 'text-foreground'
                  )}>
                    {score > previousBest.score ? '↑' : score < previousBest.score ? '↓' : '='} {score.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-base">vs {previousBest.score.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.comparison.combo')}</p>
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-xl sm:text-2xl font-bold',
                    bestCombo > previousBest.bestCombo ? 'text-chart-3' : bestCombo < previousBest.bestCombo ? 'text-chart-5' : 'text-foreground'
                  )}>
                    {bestCombo > previousBest.bestCombo ? '↑' : bestCombo < previousBest.bestCombo ? '↓' : '='} {bestCombo}x
                  </p>
                  <p className="text-muted-foreground text-base">vs {previousBest.bestCombo}x</p>
                </div>
              </div>
              {reactionTimeStats.average !== null && previousBest.averageReaction !== null && (
                <div>
                  <p className="text-muted-foreground mb-2 text-base">{t(language, 'gameover.comparison.avgReaction')}</p>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'text-xl sm:text-2xl font-bold',
                      reactionTimeStats.average < previousBest.averageReaction ? 'text-chart-3' : reactionTimeStats.average > previousBest.averageReaction ? 'text-chart-5' : 'text-foreground'
                    )}>
                      {reactionTimeStats.average < previousBest.averageReaction ? '↑' : reactionTimeStats.average > previousBest.averageReaction ? '↓' : '='} {Math.round(reactionTimeStats.average)}ms
                    </p>
                    <p className="text-muted-foreground text-base">vs {Math.round(previousBest.averageReaction)}ms</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {coachingTip && (
          <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.5)', borderColor: '#3E7CAC' }}>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 uppercase tracking-wide">
              {t(language, 'gameover.coach.title')}
            </h3>
            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">{coachingTip}</p>
          </div>
        )}
      </div>
    </div>
  );

  const DetailsTab = () => (
    <div className="space-y-3">
      {/* Reaction Time Graph */}
      {reactionTimeStats.allTimes.length > 0 && (
        <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">{t(language, 'gameover.details.reactionGraph')}</h3>
          <ReactionTimeGraph
            reactionTimes={reactionTimeStats.allTimes}
            duration={gameDuration}
          />
        </div>
      )}

      {/* Detailed Stats - Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">{t(language, 'gameover.details.title')}</h3>
          <div className="space-y-3 text-base">
            {gameMode && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.details.mode')}</span>
                <span className="font-semibold text-foreground">{t(language, `mode.${gameMode}.name`)}</span>
              </div>
            )}
            {difficulty && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.details.difficulty')}</span>
                <span className="font-semibold text-foreground">{t(language, `difficulty.name.${difficulty}`)}</span>
              </div>
            )}
            {gameDuration > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.details.duration')}</span>
                <span className="font-semibold text-foreground">
                  {Math.floor(gameDuration / 1000)}s
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-4 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Performance</h3>
          <div className="space-y-3 text-base">
            {reactionTimeStats.slowest !== null && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.details.slowest')}</span>
                <span className="font-semibold text-chart-5">
                  {Math.round(reactionTimeStats.slowest)}ms
                </span>
              </div>
            )}
            {reactionTimeStats.allTimes.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.details.accuracy')}</span>
                <span className="font-semibold text-foreground">
                  {Math.round((reactionTimeStats.allTimes.filter(t => t < 400).length / reactionTimeStats.allTimes.length) * 100)}%
                </span>
              </div>
            )}
            {reactionTimeStats.average !== null && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t(language, 'gameover.stats.avgReaction')}</span>
                <span className="font-semibold text-foreground">
                  {Math.round(reactionTimeStats.average)}ms
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const AchievementsTab = () => (
    <div>
      {newAchievements.length > 0 ? (
        <div className="p-4 bg-chart-3/10 border-2 border-chart-3 pixel-border">
          <h3 className="text-base sm:text-lg font-semibold text-chart-3 mb-3 uppercase tracking-wide">
            {t(language, 'gameover.achievements.new')}
          </h3>
          <ul className="space-y-3 text-base text-foreground/90">
            {newAchievements.map((a) => (
              <li key={a.id} className="p-3 border-2 pixel-border" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.3)' }}>
                <span className="font-semibold text-chart-3 text-lg">
                  {(() => {
                    const key = `achievement.${a.id}.title`;
                    const translated = t(language, key);
                    return translated === key ? a.title : translated;
                  })()}
                </span>
                <p className="text-foreground/70 mt-2 leading-relaxed text-base">
                  {(() => {
                    const key = `achievement.${a.id}.description`;
                    const translated = t(language, key);
                    return translated === key ? a.description : translated;
                  })()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 border-4 pixel-border text-center" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
          <p className="text-muted-foreground text-base sm:text-lg">{t(language, 'gameover.achievements.none')}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 crt-scanlines">
      <div
        className={cn(
          'relative w-full max-w-5xl border-4 p-4 sm:p-6',
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
        <div className="text-center mb-3">
          <h2
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-bold text-foreground text-glow mb-2',
              isNewHighScore && 'animate-glitch'
            )}
          >
            {isNewHighScore ? t(language, 'gameover.titleNewHigh') : t(language, 'gameover.title')}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t(language, 'gameover.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3 border-b-2" style={{ borderColor: '#3E7CAC' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2 text-base sm:text-lg font-semibold transition-all',
              activeTab === 'overview'
                ? 'text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={activeTab === 'overview' ? { borderColor: '#3E7CAC' } : {}}
          >
            {t(language, 'gameover.tab.overview')}
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-4 py-2 text-base sm:text-lg font-semibold transition-all',
              activeTab === 'details'
                ? 'text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={activeTab === 'details' ? { borderColor: '#3E7CAC' } : {}}
          >
            {t(language, 'gameover.tab.details')}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              'px-4 py-2 text-base sm:text-lg font-semibold transition-all relative',
              activeTab === 'achievements'
                ? 'text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={activeTab === 'achievements' ? { borderColor: '#3E7CAC' } : {}}
          >
            {t(language, 'gameover.tab.achievements')}
            {newAchievements.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-chart-3 rounded-full text-xs flex items-center justify-center text-black font-bold">
                {newAchievements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mb-4 min-h-[180px]">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'details' && <DetailsTab />}
          {activeTab === 'achievements' && <AchievementsTab />}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestart}
            draggable={false}
            className={cn(
              'flex-1 py-4 px-6 border-4 font-bold text-xl sm:text-2xl',
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
              'flex-1 py-4 px-6 border-4 font-bold text-lg sm:text-xl text-center',
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

