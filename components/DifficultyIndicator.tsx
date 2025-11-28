'use client';

import { DifficultyPreset } from '@/lib/difficulty';
import { cn } from '@/lib/utils';

interface DifficultyIndicatorProps {
  difficulty: DifficultyPreset;
  score: number;
}

/**
 * DifficultyIndicator component - Shows current difficulty level
 */
export function DifficultyIndicator({
  difficulty,
  score,
}: DifficultyIndicatorProps) {
  const difficultyColors = {
    easy: 'text-chart-3 border-chart-3 bg-chart-3/20',
    medium: 'text-accent border-accent bg-accent/20',
    hard: 'text-destructive border-destructive bg-destructive/20',
    custom: 'text-primary border-primary bg-primary/20',
    nightmare: 'text-secondary border-secondary bg-secondary/20',
  };

  const difficultyNames = {
    easy: 'EASY',
    medium: 'MED',
    hard: 'HARD',
    custom: 'CUSTOM',
    nightmare: 'NIGHTMARE',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground">Level:</span>
      <span
        className={cn(
          'text-xs sm:text-sm font-bold px-2 py-1 pixel-border',
          difficultyColors[difficulty]
        )}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        {difficultyNames[difficulty]}
      </span>
    </div>
  );
}

