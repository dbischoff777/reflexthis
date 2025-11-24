'use client';

import { cn } from '@/lib/utils';
import { getComboMultiplier } from '@/lib/gameUtils';

interface ComboDisplayProps {
  combo: number;
}

/**
 * ComboDisplay component - Shows current combo streak with multiplier
 */
export function ComboDisplay({ combo }: ComboDisplayProps) {
  if (combo === 0) return null;

  const multiplier = getComboMultiplier(combo);

  return (
    <div className="flex items-center gap-2 text-primary animate-scaleIn">
      <span className="text-sm sm:text-base font-semibold">Combo:</span>
      <span
        className={cn(
          'text-lg sm:text-xl font-bold pixel-border px-2 py-1',
          'transition-all duration-200',
          multiplier >= 3
            ? 'text-accent border-accent bg-accent/20 animate-pixel-pulse'
            : 'text-primary border-primary bg-primary/10'
        )}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        {combo}x
      </span>
      {multiplier > 1 && (
        <span
          className={cn(
            'text-xs sm:text-sm font-bold px-2 py-1',
            'bg-accent/30 border-2 border-accent',
            'animate-pixel-pulse pixel-border',
            multiplier >= 3 && 'bg-accent/50'
          )}
          style={{
            imageRendering: 'pixelated',
          }}
        >
          {multiplier}x MULTIPLIER!
        </span>
      )}
    </div>
  );
}

