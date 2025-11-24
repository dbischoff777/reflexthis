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
          'text-lg sm:text-xl font-bold text-primary transition-all duration-200',
          'pixel-border px-2 py-1',
          animate && 'text-glow scale-110 bg-primary/20 border-primary'
        )}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        {score}
      </span>
      {animate && (
        <span
          className="absolute -top-3 -right-3 text-xs font-bold text-chart-3 pixel-border px-1 bg-chart-3/20 border-chart-3 animate-[fadeOut_0.6s_ease-out]"
          style={{
            animation: 'fadeOut 0.6s ease-out',
            imageRendering: 'pixelated',
          }}
        >
          +1
        </span>
      )}
    </div>
  );
}

