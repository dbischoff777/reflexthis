'use client';

import { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';

interface LivesDisplayProps {
  lives: number;
  totalLives?: number;
}

/**
 * LivesDisplay component - Shows remaining lives with pixelated block style
 * Optimized with React.memo and useMemo to prevent unnecessary re-renders
 */
export const LivesDisplay = memo(function LivesDisplay({ lives, totalLives = 5 }: LivesDisplayProps) {
  // Memoize expensive calculations
  const isSurvival = useMemo(() => totalLives === 1, [totalLives]);
  
  const lifeBlocks = useMemo(() => {
    return Array.from({ length: totalLives }).map((_, i) => {
      const isActive = i < lives;
      const isLow = (lives <= 2 && isActive) || isSurvival;
          
          return (
            <div
              key={i}
              className={cn(
                'w-5 h-5 border-2 pixel-border transition-all duration-200',
                isActive
                  ? isLow
                    ? 'bg-destructive border-destructive animate-pixel-pulse'
                    : 'bg-chart-3 border-chart-3'
                  : 'bg-muted border-muted opacity-30'
              )}
              style={{
                imageRendering: 'pixelated' as any,
              }}
              aria-label={isActive ? 'Life remaining' : 'Life lost'}
            />
          );
        });
  }, [totalLives, lives, isSurvival]);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm sm:text-base text-muted-foreground">
        {isSurvival ? 'Survival' : 'Lives'}:
      </span>
      <div className="flex gap-1">
        {lifeBlocks}
      </div>
    </div>
  );
});

