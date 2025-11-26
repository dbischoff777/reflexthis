'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ButtonCountdownProps {
  duration: number;
  startTime: number;
  onComplete?: () => void;
}

/**
 * ButtonCountdown component - Shows a single prominent square progress indicator
 * that matches the button shape and communicates urgency through color and intensity
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

  // Determine urgency level and color progression
  // Green (safe) → Yellow (warning) → Orange (urgent) → Red (critical)
  const getColor = () => {
    if (progress > 60) {
      // Green - plenty of time
      return { color: '#00ff00', glow: 'rgba(0, 255, 0, 0.6)' };
    } else if (progress > 40) {
      // Yellow - getting urgent
      return { color: '#ffff00', glow: 'rgba(255, 255, 0, 0.7)' };
    } else if (progress > 20) {
      // Orange - urgent
      return { color: '#ff8800', glow: 'rgba(255, 136, 0, 0.8)' };
    } else {
      // Red - critical
      return { color: '#ff0000', glow: 'rgba(255, 0, 0, 1)' };
    }
  };

  const urgencyLevel = progress < 20 ? 'critical' : progress < 40 ? 'warning' : 'normal';
  const isUrgent = urgencyLevel === 'critical' || urgencyLevel === 'warning';
  const { color, glow } = getColor();

  // Calculate border width based on progress (shrinks inward)
  // Start with full border, shrink to show time running out
  const borderWidth = 4;
  const shrinkAmount = (1 - progress / 100) * 50; // Shrink up to 50% from edges
  const inset = `${shrinkAmount}%`;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-20',
        'flex items-center justify-center'
      )}
    >
      {/* Single prominent square progress border that shrinks inward */}
      <div
        className={cn(
          'absolute border-4 transition-all duration-75',
          isUrgent && 'animate-pulse'
        )}
        style={{
          top: inset,
          right: inset,
          bottom: inset,
          left: inset,
          borderColor: color,
          borderRadius: '0',
          imageRendering: 'pixelated' as any,
          boxShadow: isUrgent
            ? `0 0 12px ${glow}, 0 0 24px ${glow}, 0 0 36px ${glow}, inset 0 0 12px ${glow}`
            : `0 0 8px ${glow}, 0 0 16px ${glow}, inset 0 0 8px ${glow}`,
          filter: isUrgent ? 'brightness(1.2)' : 'brightness(1)',
        }}
      />
    </div>
  );
}

