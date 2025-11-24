'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ButtonCountdownProps {
  duration: number;
  startTime: number;
  onComplete?: () => void;
}

/**
 * ButtonCountdown component - Shows countdown timer on highlighted buttons
 */
export function ButtonCountdown({
  duration,
  startTime,
  onComplete,
}: ButtonCountdownProps) {
  const [remaining, setRemaining] = useState(duration);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!startTime || duration <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newRemaining = Math.max(0, duration - elapsed);
      const newProgress = (newRemaining / duration) * 100;

      setRemaining(newRemaining);
      setProgress(newProgress);

      if (newRemaining <= 0) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, startTime, onComplete]);

  if (!startTime || duration <= 0) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-20',
        'flex items-center justify-center',
        'countdown-pulse'
      )}
      style={{
        animationDuration: `${duration}ms`,
      }}
    >
      {/* Progress indicator - top border that shrinks */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-destructive"
        style={{
          transform: `scaleX(${progress / 100})`,
          transformOrigin: 'left',
        }}
      />
      
      {/* Countdown text - only show if more than 200ms remaining */}
      {remaining > 200 && (
        <span
          className="text-[10px] font-bold pixel-border px-1 text-destructive border-destructive bg-destructive/40"
          style={{
            imageRendering: 'pixelated',
          }}
        >
          {Math.ceil(remaining / 100)}
        </span>
      )}
    </div>
  );
}

