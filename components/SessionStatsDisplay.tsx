'use client';

import { useState } from 'react';
import { SessionStatistics, formatPlaytime } from '@/lib/sessionStats';
import { getMetaProgression } from '@/lib/progression';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SessionStatsDisplayProps {
  stats: SessionStatistics;
}

type TabType = 'overview' | 'achievements' | 'history';

/**
 * SessionStatsDisplay component - Shows overall session statistics with tabs
 */
export function SessionStatsDisplay({ stats }: SessionStatsDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  if (stats.totalGames === 0) {
    return (
      <div className="p-6 bg-card border-4 border-border text-center pixel-border">
        <p className="text-muted-foreground mb-4 break-words">No games played yet!</p>
        <Link
          href="/game"
          className="inline-block px-6 py-2 border-4 border-primary bg-primary text-primary-foreground font-semibold hover:border-secondary hover:bg-secondary transition-all duration-100 pixel-border"
        >
          Play Your First Game
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
    { id: 'overview', label: 'Overview' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="p-4 sm:p-6 bg-card border-4 border-border pixel-border">
      <h3 className="text-xl font-bold text-primary mb-4">Session Statistics</h3>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b-2 border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px]',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Total Games</p>
            <p className="text-2xl font-bold text-primary">{stats.totalGames}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Playtime</p>
            <p className="text-2xl font-bold text-primary">{formatPlaytime(stats.totalPlaytime)}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Today</p>
            <p className="text-2xl font-bold text-secondary">{stats.gamesPlayedToday}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Best Score</p>
            <p className="text-2xl font-bold text-primary">{stats.bestScore}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Best Combo</p>
            <p className="text-2xl font-bold text-secondary">{stats.bestCombo}x</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-primary">{Math.round(stats.averageScore)}</p>
          </div>
            </div>

            {/* Reaction Time Stats */}
            {(stats.averageReactionTime !== null || stats.fastestReactionTime !== null) && (
              <div className="grid grid-cols-2 gap-4">
            {stats.averageReactionTime !== null && (
              <div className="bg-card p-3 border-2 border-border pixel-border">
                <p className="text-xs text-muted-foreground mb-1">Avg Reaction</p>
                <p className="text-xl font-bold text-primary">
                  {formatTime(stats.averageReactionTime)}
                </p>
              </div>
            )}
            
            {stats.fastestReactionTime !== null && (
              <div className="bg-card p-3 border-2 border-border pixel-border">
                <p className="text-xs text-muted-foreground mb-1">Fastest</p>
                <p className="text-xl font-bold text-chart-3">
                  {formatTime(stats.fastestReactionTime)}
                </p>
              </div>
            )}
              </div>
            )}

            {/* Rank & Recommendation */}
            {meta.rank && (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)]">
            <div className="p-3 bg-card border-2 border-border pixel-border text-left">
              <p className="text-xs text-muted-foreground mb-1">Current Rank</p>
              <p className="text-lg font-bold text-primary">{meta.rank.name}</p>
              {meta.rank.nextName && meta.rank.nextMinScore !== undefined && (
                <p className="mt-1 text-[11px] text-foreground/70">
                  Next: <span className="font-semibold">{meta.rank.nextName}</span> at{' '}
                  <span className="font-mono">{meta.rank.nextMinScore}</span> score.
                </p>
              )}
            </div>
            {meta.recommendation && (
              <div className="p-3 bg-card border-2 border-primary/60 pixel-border text-left">
                <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
                  Suggested Next Goal
                </p>
                <p className="text-xs text-foreground/80 break-words">{meta.recommendation}</p>
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            {meta.achievements.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold text-primary">Achievements</h4>
            <div className="space-y-2">
              {meta.achievements.map((a) => {
                const progressPercent = Math.round((a.current / a.target) * 100);
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'p-2 border-2 pixel-border text-xs sm:text-[13px] flex flex-col gap-1',
                      a.achieved
                        ? 'bg-chart-3/10 border-chart-3'
                        : 'bg-card border-border'
                    )}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-primary">{a.title}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {a.current}/{a.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/70 break-words">{a.description}</p>
                    <div className="h-1.5 bg-background/60 border border-border mt-1 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          a.achieved ? 'bg-chart-3' : 'bg-primary/70'
                        )}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No achievements yet. Keep playing to unlock them!
              </p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {stats.recentGames.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold text-primary">Recent Games</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-2 bg-card border-2 border-border text-sm pixel-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{game.score}</span>
                    {game.bestCombo > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {game.bestCombo}x combo
                      </span>
                    )}
                    {game.averageReactionTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(game.averageReactionTime)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
              </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No game history yet. Play some games to see your progress here!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

