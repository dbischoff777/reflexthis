'use client';

import { useState } from 'react';
import { SessionStatistics, formatPlaytime } from '@/lib/sessionStats';
import { getMetaProgression } from '@/lib/progression';
import { cn } from '@/lib/utils';
import { t, type Language } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';
import Link from 'next/link';

interface SessionStatsDisplayProps {
  stats: SessionStatistics;
  hideTitle?: boolean;
}

type TabType = 'overview' | 'achievements' | 'history';

/**
 * SessionStatsDisplay component - Shows overall session statistics with tabs
 */
export function SessionStatsDisplay({ stats, hideTitle = false }: SessionStatsDisplayProps) {
  const { language } = useGameState();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const translateRecommendation = (language: Language, recommendation: string): string => {
    if (!recommendation) return '';

    if (recommendation === 'Play a few runs to unlock personalized recommendations.') {
      return t(language, 'stats.recommendation.playMore');
    }

    if (recommendation === "You're crushing Easy. Try Medium for a bigger challenge.") {
      return t(language, 'stats.recommendation.easyToMedium');
    }

    if (recommendation === 'Medium is looking good – consider switching to Hard next run.') {
      return t(language, 'stats.recommendation.mediumToHard');
    }

    if (recommendation === 'Your combos and scores are strong. Hard difficulty is ready for you.') {
      return t(language, 'stats.recommendation.goHard');
    }

    if (recommendation.startsWith('Your longest Hard run is')) {
      const match = recommendation.match(/Your longest Hard run is (\\d+)s/);
      const seconds = match ? match[1] : '';
      return t(language, 'stats.recommendation.hardEndurance').replace('{seconds}', seconds);
    }

    if (recommendation === 'Focus on keeping your combo alive; every extra hit dramatically boosts your score.') {
      return t(language, 'stats.recommendation.comboFocus');
    }

    return recommendation;
  };
  if (stats.totalGames === 0) {
    return (
      <div className="p-6 bg-card border-4 border-border text-center pixel-border">
        <p className="text-muted-foreground mb-4 wrap-break-word">{t(language, 'stats.noGames')}</p>
        <Link
          href="/game"
          className="inline-block px-6 py-2 border-4 border-primary bg-primary text-primary-foreground font-semibold hover:border-secondary hover:bg-secondary transition-all duration-100 pixel-border"
        >
          {t(language, 'stats.playFirst')}
        </Link>
      </div>
    );
  }

  const formatTime = (time: number | null): string => {
    if (time === null) return '--';
    return `${Math.round(time)}ms`;
  };

  const meta = getMetaProgression(stats);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: t(language, 'stats.tab.overview') },
    { id: 'achievements', label: t(language, 'stats.tab.achievements') },
    { id: 'history', label: t(language, 'stats.tab.history') },
  ];

  return (
    <div className={hideTitle ? 'w-full' : 'p-4 sm:p-6 bg-card border-4 border-border pixel-border'}>
      {!hideTitle && (
        <h3 className="text-lg sm:text-xl font-bold text-primary mb-4">{t(language, 'stats.title')}</h3>
      )}
      
      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-4 border-b border-border/70">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-3 sm:px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-t-md',
              activeTab === tab.id
                ? 'text-primary bg-primary/15 border-b-2 border-primary shadow-[0_3px_0_rgba(0,255,255,0.7)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 border-b-2 border-transparent'
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content - flexible height to avoid scrollbars */}
      <div className="min-h-0 w-full overflow-hidden">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4 w-full">
            {/* Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.totalGames')}</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{stats.totalGames}</p>
          </div>
          
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.playtime')}</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{formatPlaytime(stats.totalPlaytime)}</p>
          </div>
          
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.today')}</p>
            <p className="text-xl sm:text-2xl font-bold text-secondary">{stats.gamesPlayedToday}</p>
          </div>
          
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.bestScore')}</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{stats.bestScore}</p>
          </div>
          
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.bestCombo')}</p>
            <p className="text-xl sm:text-2xl font-bold text-secondary">{stats.bestCombo}x</p>
          </div>
          
          <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.avgScore')}</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{Math.round(stats.averageScore)}</p>
          </div>
            </div>

            {/* Reaction Time Stats */}
            {(stats.averageReactionTime !== null || stats.fastestReactionTime !== null) && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {stats.averageReactionTime !== null && (
              <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.avgReaction')}</p>
                <p className="text-lg sm:text-xl font-bold text-primary">
                  {formatTime(stats.averageReactionTime)}
                </p>
              </div>
            )}
            
            {stats.fastestReactionTime !== null && (
              <div className="bg-card p-2 sm:p-3 border-2 border-border pixel-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.fastest')}</p>
                <p className="text-lg sm:text-xl font-bold text-chart-3">
                  {formatTime(stats.fastestReactionTime)}
                </p>
              </div>
            )}
              </div>
            )}

            {/* Rank & Recommendation */}
            {meta.rank && (
              <div className="grid gap-2 sm:gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)]">
            <div className="p-2 sm:p-3 bg-card border-2 border-border pixel-border text-left">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.currentRank')}</p>
              <p className="text-base sm:text-lg font-bold text-primary">{meta.rank.name}</p>
              {meta.rank.nextName && meta.rank.nextMinScore !== undefined && (
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-foreground/70">
                  {t(language, 'stats.overview.nextRank')} <span className="font-semibold">{meta.rank.nextName}</span> {t(language, 'stats.overview.atScore')}{' '}
                  <span className="font-mono">{meta.rank.nextMinScore}</span> {t(language, 'stats.overview.score')}
                </p>
              )}
            </div>
            {meta.recommendation && (
              <div className="p-2 sm:p-3 bg-card border-2 border-primary/60 pixel-border text-left">
                <p className="text-[10px] sm:text-xs font-semibold text-primary mb-0.5 sm:mb-1 uppercase tracking-wide">
                  {t(language, 'stats.overview.suggestedGoal')}
                </p>
                <p className="text-[10px] sm:text-xs text-foreground/80 wrap-break-word">
                  {translateRecommendation(language, meta.recommendation)}
                </p>
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-2 sm:space-y-3 w-full flex flex-col">
            {meta.achievements.length > 0 ? (
              <>
                <h4 className="text-xs sm:text-sm font-semibold text-primary shrink-0">
                  {t(language, 'stats.achievements.title')}
                </h4>
                <div className="space-y-1.5 sm:space-y-2 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden rounded-md bg-background/10 border border-border/60 p-2 sm:p-3">
                  {meta.achievements.map((a) => {
                    const progressPercent = Math.round((a.current / a.target) * 100);
                    const rarityLabel = t(language, `rarity.${a.rarity}`);
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'p-2 sm:p-3 border border-border/60 bg-card/80 rounded pixel-border',
                          'text-xs sm:text-[13px] flex flex-col gap-1.5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="text-xl sm:text-2xl shrink-0">
                              {a.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-primary wrap-break-word">
                                  {(() => {
                                    const key = `achievement.${a.id}.title`;
                                    const translated = t(language, key);
                                    return translated === key ? a.title : translated;
                                  })()}
                                </span>
                                {a.achieved && (
                                  <span className="text-[10px] px-1.5 py-0.5 border border-chart-3 bg-chart-3/20 text-chart-3 rounded pixel-border shrink-0">
                                    {t(language, 'stats.achievements.unlocked')}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-foreground/70 wrap-break-word">
                                {(() => {
                                  const key = `achievement.${a.id}.description`;
                                  const translated = t(language, key);
                                  return translated === key ? a.description : translated;
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 border border-border/60 bg-background/60 rounded uppercase tracking-wide">
                              {rarityLabel}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {a.current}/{a.target}
                            </span>
                          </div>
                        </div>
                        {!a.achieved && (
                          <div className="h-1.5 bg-background/80 border border-border mt-1 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                'h-full transition-all',
                                a.rarity === 'legendary' && 'bg-chart-3',
                                a.rarity === 'epic' && 'bg-secondary',
                                a.rarity === 'rare' && 'bg-primary',
                                a.rarity === 'common' && 'bg-muted'
                              )}
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {t(language, 'stats.achievements.noAchievements')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2 sm:space-y-3 w-full flex flex-col">
            {stats.recentGames.length > 0 ? (
              <>
                <h4 className="text-xs sm:text-sm font-semibold text-primary shrink-0">
                  {t(language, 'stats.history.title')}
                </h4>
                <div className="space-y-1.5 sm:space-y-2 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden rounded-md bg-background/10 border border-border/60 p-2 sm:p-3">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_auto] text-[11px] uppercase tracking-wide text-muted-foreground/80 px-2 pb-1 border-b border-border/40">
                    <span>{t(language, 'stats.history.scoreCombo')}</span>
                    <span>{t(language, 'stats.history.reaction')}</span>
                    <span className="text-right">{t(language, 'stats.history.date')}</span>
                  </div>
                  {stats.recentGames.map((game) => (
                    <div
                      key={game.id}
                      className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_auto] items-center gap-2 px-2 py-1.5 bg-card/80 border border-border/60 rounded text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-primary">
                          {game.score}
                        </span>
                        {game.bestCombo > 0 && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {game.bestCombo}x {t(language, 'stats.history.combo')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {game.averageReactionTime
                          ? formatTime(game.averageReactionTime)
                          : '--'}
                      </div>
                      <span className="text-[11px] text-muted-foreground text-right">
                        {new Date(game.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  {t(language, 'stats.history.noHistory')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

