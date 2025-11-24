'use client';

import { cn } from '@/lib/utils';
import { ReactionTimeStats } from '@/lib/GameContext';

interface ReactionTimeDisplayProps {
  stats: ReactionTimeStats;
}

/**
 * ReactionTimeDisplay component - Shows reaction time statistics
 */
export function ReactionTimeDisplay({ stats }: ReactionTimeDisplayProps) {
  if (stats.allTimes.length === 0) return null;

  const getReactionColor = (time: number | null): string => {
    if (time === null) return 'text-muted-foreground';
    if (time < 300) return 'text-chart-3';
    if (time < 500) return 'text-accent';
    return 'text-chart-5';
  };

  const formatTime = (time: number | null): string => {
    if (time === null) return '--';
    return `${Math.round(time)}ms`;
  };

  return (
    <div className="flex flex-col gap-1 text-xs sm:text-sm">
      {stats.current !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Last:</span>
          <span className={cn('font-semibold', getReactionColor(stats.current))}>
            {formatTime(stats.current)}
          </span>
        </div>
      )}
      {stats.average !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Avg:</span>
          <span className={cn('font-semibold', getReactionColor(stats.average))}>
            {formatTime(stats.average)}
          </span>
        </div>
      )}
      {stats.fastest !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Best:</span>
          <span className="font-semibold text-chart-3">
            {formatTime(stats.fastest)}
          </span>
        </div>
      )}
    </div>
  );
}

