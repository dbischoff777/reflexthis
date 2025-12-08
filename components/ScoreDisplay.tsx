'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/AnimatedNumber';

interface ScoreDisplayProps {
  score: number;
  className?: string;
}

/**
 * ScoreDisplay component with smooth counting animation and visual feedback
 * Optimized with React.memo to prevent unnecessary re-renders
 */
export const ScoreDisplay = React.memo(function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  const [animate, setAnimate] = useState(false);
  const [previousScore, setPreviousScore] = useState(score);
  const [scoreDiff, setScoreDiff] = useState(0);

  useEffect(() => {
    if (score > previousScore && score > 0) {
      setScoreDiff(score - previousScore);
      setAnimate(true);
      const timer = setTimeout(() => {
        setAnimate(false);
        setScoreDiff(0);
      }, 400);
      return () => clearTimeout(timer);
    }
    setPreviousScore(score);
  }, [score, previousScore]);

  return (
    <div className={cn('relative inline-block', className)}>
      <span
        className={cn(
          'text-lg sm:text-xl font-bold text-primary transition-all duration-300 ease-out',
          'pixel-border px-2 py-1',
          animate && 'text-glow scale-110 bg-primary/20 border-primary'
        )}
        style={{
          imageRendering: 'pixelated',
          transform: 'translateZ(0)',
          willChange: animate ? 'transform, opacity' : 'auto',
        }}
      >
        <AnimatedNumber
          value={score}
          duration={600}
          formatValue={(v) => Math.round(v).toString()}
        />
      </span>
      {animate && scoreDiff > 0 && (
        <span
          className="absolute -top-3 -right-3 text-xs font-bold text-chart-3 pixel-border px-1 bg-chart-3/20 border-chart-3 animate-[fadeOutUp_0.6s_ease-out]"
          style={{
            animation: 'fadeOutUp 0.6s ease-out',
            imageRendering: 'pixelated',
          }}
        >
          +{scoreDiff}
        </span>
      )}
    </div>
  );
});

