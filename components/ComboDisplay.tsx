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
          'text-lg sm:text-xl font-bold',
          'transition-all duration-300',
          multiplier >= 3 && 'text-accent'
        )}
      >
        {combo}x
      </span>
      {multiplier > 1 && (
        <span
          className={cn(
            'text-xs sm:text-sm font-bold px-2 py-0.5 rounded',
            'bg-primary/20 border border-primary/50',
            'animate-pulse-glow'
          )}
        >
          {multiplier}x MULTIPLIER!
        </span>
      )}
    </div>
  );
}

