'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ButtonPressFeedbackProps {
  buttonId: number;
  isCorrect: boolean;
  onAnimationComplete?: () => void;
}

/**
 * ButtonPressFeedback component - Provides visual feedback for button presses
 */
export function ButtonPressFeedback({
  buttonId,
  isCorrect,
  onAnimationComplete,
}: ButtonPressFeedbackProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [buttonId, onAnimationComplete]);

  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-10',
        'flex items-center justify-center',
        isCorrect
          ? 'bg-chart-3/40 border-4 border-chart-3'
          : 'bg-destructive/40 border-4 border-destructive'
      )}
      style={{
        imageRendering: 'pixelated',
        animation: isCorrect ? 'pixel-pulse 0.3s ease-out' : 'shake 0.3s ease-out',
      }}
    >
      <span
        className={cn(
          'text-2xl font-bold pixel-border px-2 py-1',
          isCorrect ? 'text-chart-3 border-chart-3' : 'text-destructive border-destructive'
        )}
      >
        {isCorrect ? '✓' : '✕'}
      </span>
    </div>
  );
}

