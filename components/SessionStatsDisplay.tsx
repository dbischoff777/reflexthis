'use client';

import { SessionStatistics } from '@/lib/sessionStats';
import { formatPlaytime } from '@/lib/sessionStats';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SessionStatsDisplayProps {
  stats: SessionStatistics;
}

/**
 * SessionStatsDisplay component - Shows overall session statistics
 */
export function SessionStatsDisplay({ stats }: SessionStatsDisplayProps) {
  if (stats.totalGames === 0) {
    return (
      <div className="p-6 bg-card border-4 border-border text-center pixel-border">
        <p className="text-muted-foreground mb-4">No games played yet!</p>
        <Link
          href="/game"
          className="inline-block px-6 py-2 border-4 border-primary bg-primary text-primary-foreground font-semibold hover:border-accent hover:bg-accent transition-all duration-100 pixel-border"
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

  return (
    <div className="p-6 bg-card border-4 border-border space-y-6 pixel-border">
      <div>
        <h3 className="text-xl font-bold text-primary mb-4">Session Statistics</h3>
        
        {/* Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
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
            <p className="text-2xl font-bold text-accent">{stats.gamesPlayedToday}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Best Score</p>
            <p className="text-2xl font-bold text-primary">{stats.bestScore}</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Best Combo</p>
            <p className="text-2xl font-bold text-accent">{stats.bestCombo}x</p>
          </div>
          
          <div className="bg-card p-3 border-2 border-border pixel-border">
            <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-primary">{Math.round(stats.averageScore)}</p>
          </div>
        </div>

        {/* Reaction Time Stats */}
        {(stats.averageReactionTime !== null || stats.fastestReactionTime !== null) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
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

        {/* Recent Games */}
        {stats.recentGames.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-3">Recent Games</h4>
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
          </div>
        )}
      </div>
    </div>
  );
}

