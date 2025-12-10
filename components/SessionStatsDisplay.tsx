'use client';

import { useState } from 'react';
import { SessionStatistics, formatPlaytime, getGameSessions } from '@/lib/sessionStats';
import { getAchievementProgress } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import { t, type Language } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';
import { GameMode } from '@/lib/gameModes';
import Link from 'next/link';

interface SessionStatsDisplayProps {
  stats: SessionStatistics;
  hideTitle?: boolean;
  gameMode?: GameMode;
}

type TabType = 'overview' | 'achievements' | 'history';

/**
 * SessionStatsDisplay component - Shows overall session statistics with tabs
 */
export function SessionStatsDisplay({ stats, hideTitle = false, gameMode }: SessionStatsDisplayProps) {
  const { language } = useGameState();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Get achievement progress
  const allSessions = getGameSessions();
  const sessions = gameMode ? allSessions.filter(s => s.gameMode === gameMode) : allSessions;
  const achievements = getAchievementProgress(stats, sessions);

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
      <div className="p-6 border-4 text-center pixel-border" style={{ backgroundColor: '#003A63', borderColor: '#3E7CAC' }}>
        <p className="text-muted-foreground mb-4 wrap-break-word">{t(language, 'stats.noGames')}</p>
        <Link
          href="/game"
          className="inline-block px-6 py-2 border-4 font-semibold transition-all duration-100 pixel-border"
          style={{
            borderColor: '#3E7CAC',
            backgroundColor: '#3E7CAC',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ff00ff';
            e.currentTarget.style.borderColor = '#ff00ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3E7CAC';
            e.currentTarget.style.borderColor = '#3E7CAC';
          }}
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

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: t(language, 'stats.tab.overview') },
    { id: 'achievements', label: t(language, 'stats.tab.achievements') },
    { id: 'history', label: t(language, 'stats.tab.history') },
  ];

  return (
    <div className={hideTitle ? 'w-full min-w-full block' : 'p-4 sm:p-6 border-4 pixel-border w-full block'} style={hideTitle ? { width: '100%', minWidth: '100%', maxWidth: '100%', display: 'block', boxSizing: 'border-box' } : { backgroundColor: '#003A63', borderColor: '#3E7CAC', width: '100%', minWidth: '100%', maxWidth: '100%', display: 'block', boxSizing: 'border-box' }}>
      {!hideTitle && (
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">{t(language, 'stats.title')}</h3>
      )}
      
      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-4 border-b" style={{ borderColor: '#3E7CAC' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold transition-all duration-200 rounded-t-md',
              activeTab === tab.id
                ? 'text-foreground border-b-2'
                : 'text-foreground/70 hover:text-foreground border-b-2 border-transparent'
            )}
            style={activeTab === tab.id ? {
              backgroundColor: 'rgba(62, 124, 172, 0.2)',
              borderBottomColor: '#3E7CAC',
              boxShadow: '0 3px 0 rgba(62, 124, 172, 0.5)',
            } : {}}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content - flexible height to avoid scrollbars */}
      <div className="min-h-0 w-full block" style={{ width: '100%', minWidth: '100%', maxWidth: '100%', flexShrink: 0, display: 'block', boxSizing: 'border-box' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4 w-full" style={{ width: '100%', minWidth: '100%' }}>
            {/* Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.totalGames')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{stats.totalGames}</p>
          </div>
          
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.playtime')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{formatPlaytime(stats.totalPlaytime)}</p>
          </div>
          
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.today')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary">{stats.gamesPlayedToday}</p>
          </div>
          
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.bestScore')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{stats.bestScore}</p>
          </div>
          
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.bestCombo')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary">{stats.bestCombo}x</p>
          </div>
          
          <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.avgScore')}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{Math.round(stats.averageScore)}</p>
          </div>
            </div>

            {/* Reaction Time Stats */}
            {(stats.averageReactionTime !== null || stats.fastestReactionTime !== null) && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {stats.averageReactionTime !== null && (
              <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.avgReaction')}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {formatTime(stats.averageReactionTime)}
                </p>
              </div>
            )}
            
            {stats.fastestReactionTime !== null && (
              <div className="p-2 sm:p-3 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{t(language, 'stats.overview.fastest')}</p>
                <p className="text-xl sm:text-2xl font-bold text-chart-3">
                  {formatTime(stats.fastestReactionTime)}
                </p>
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-3 sm:space-y-4 w-full" style={{ width: '100%', minWidth: '100%' }}>
            {achievements.length > 0 ? (
              <div className="block w-full space-y-1.5 sm:space-y-2 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-450px)] overflow-y-auto rounded-md p-2 sm:p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: '#3E7CAC', borderWidth: '1px', borderStyle: 'solid', width: '100%', minWidth: '100%', maxWidth: '100%', flexShrink: 0, boxSizing: 'border-box' }}>
                  {achievements.map((a) => {
                    const progressPercent = Math.round((a.progress.current / a.progress.target) * 100);
                    const rarityLabel = t(language, `rarity.${a.rarity}`);
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'p-2 sm:p-3 border rounded pixel-border w-full',
                          'text-sm sm:text-base flex flex-col gap-1.5'
                        )}
                        style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)', width: '100%' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="text-xl sm:text-2xl shrink-0">
                              {a.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm sm:text-base font-semibold text-foreground wrap-break-word">
                                  {(() => {
                                    const key = `achievement.${a.id}.title`;
                                    const translated = t(language, key);
                                    return translated === key ? a.title : translated;
                                  })()}
                                </span>
                                {a.unlocked && (
                                  <span className="text-xs px-1.5 py-0.5 border border-chart-3 bg-chart-3/20 text-chart-3 rounded pixel-border shrink-0">
                                    {t(language, 'stats.achievements.unlocked')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-foreground/70 wrap-break-word">
                                {(() => {
                                  const key = `achievement.${a.id}.description`;
                                  const translated = t(language, key);
                                  return translated === key ? a.description : translated;
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-xs px-1.5 py-0.5 border rounded uppercase tracking-wide" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                              {rarityLabel}
                            </span>
                            <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                              {a.progress.current}/{a.progress.target}
                            </span>
                          </div>
                        </div>
                        {!a.unlocked && (
                          <div className="h-1.5 border mt-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderColor: '#3E7CAC', borderWidth: '1px', borderStyle: 'solid' }}>
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
            ) : (
              <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-sm sm:text-base text-muted-foreground text-center">
                  {t(language, 'stats.achievements.noAchievements')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3 sm:space-y-4 w-full" style={{ width: '100%', minWidth: '100%' }}>
            {stats.recentGames.length > 0 ? (
              <div className="block w-full space-y-1.5 sm:space-y-2 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-450px)] overflow-y-auto rounded-md p-2 sm:p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: '#3E7CAC', borderWidth: '1px', borderStyle: 'solid', width: '100%', minWidth: '100%', maxWidth: '100%', flexShrink: 0, boxSizing: 'border-box' }}>
                  <div className="hidden sm:grid grid-cols-[3fr_2fr_2fr] text-xs sm:text-sm uppercase tracking-wide text-foreground/60 px-2 pb-1" style={{ borderBottomColor: '#3E7CAC', borderBottomWidth: '1px', borderBottomStyle: 'solid', width: '100%', minWidth: '100%', maxWidth: '100%', display: 'grid', boxSizing: 'border-box' }}>
                    <span>{t(language, 'stats.history.scoreCombo')}</span>
                    <span>{t(language, 'stats.history.reaction')}</span>
                    <span className="text-right">{t(language, 'stats.history.date')}</span>
                  </div>
                  {stats.recentGames.map((game) => (
                    <div
                      key={game.id}
                      className="grid grid-cols-[3fr_2fr_2fr] items-center gap-2 px-2 py-1.5 border rounded text-sm sm:text-base"
                      style={{ backgroundColor: 'rgba(0, 58, 99, 0.5)', borderColor: '#3E7CAC', width: '100%', minWidth: '100%', maxWidth: '100%', display: 'grid', boxSizing: 'border-box' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-foreground">
                          {game.score}
                        </span>
                        {game.bestCombo > 0 && (
                          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            {game.bestCombo}x {t(language, 'stats.history.combo')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {game.averageReactionTime
                          ? formatTime(game.averageReactionTime)
                          : '--'}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground text-right">
                        {new Date(game.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-sm sm:text-base text-muted-foreground text-center">
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

