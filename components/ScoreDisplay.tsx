'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  className?: string;
}

/**
 * ScoreDisplay component with animation effects when score changes
 */
export function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  const [animate, setAnimate] = useState(false);
  const [previousScore, setPreviousScore] = useState(score);

  useEffect(() => {
    if (score > previousScore && score > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
    setPreviousScore(score);
  }, [score, previousScore]);

  return (
    <div className={cn('relative inline-block', className)}>
      <span
        className={cn(
          'text-lg sm:text-xl font-bold text-primary transition-all duration-300',
          animate && 'text-glow scale-110'
        )}
      >
        {score}
      </span>
      {animate && (
        <span
          className="absolute -top-2 -right-2 text-xs text-primary animate-[fadeOut_0.5s_ease-out]"
          style={{
            animation: 'fadeOut 0.5s ease-out',
          }}
        >
          +1
        </span>
      )}
    </div>
  );
}

