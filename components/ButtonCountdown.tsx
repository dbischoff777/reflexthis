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

  // Determine urgency level
  const urgencyLevel = progress < 20 ? 'critical' : progress < 40 ? 'warning' : 'normal';
  const isUrgent = urgencyLevel === 'critical' || urgencyLevel === 'warning';

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
      {/* Progress ring around button */}
      <svg
        className="absolute inset-0 w-full h-full transform -rotate-90"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.5))' }}
      >
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={urgencyLevel === 'critical' ? '#ff0000' : urgencyLevel === 'warning' ? '#ff8800' : '#ff00ff'}
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          className={cn(
            'transition-all duration-75',
            isUrgent && 'animate-pulse'
          )}
          style={{
            strokeLinecap: 'round',
          }}
        />
      </svg>

      {/* Progress indicator - top border that shrinks */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 transition-colors duration-150',
          urgencyLevel === 'critical' ? 'bg-destructive' : urgencyLevel === 'warning' ? 'bg-accent' : 'bg-primary'
        )}
        style={{
          transform: `scaleX(${progress / 100})`,
          transformOrigin: 'left',
          boxShadow: isUrgent ? '0 0 8px currentColor' : 'none',
        }}
      />
      
      {/* Bottom border indicator */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 transition-colors duration-150',
          urgencyLevel === 'critical' ? 'bg-destructive' : urgencyLevel === 'warning' ? 'bg-accent' : 'bg-primary'
        )}
        style={{
          transform: `scaleX(${progress / 100})`,
          transformOrigin: 'right',
          boxShadow: isUrgent ? '0 0 8px currentColor' : 'none',
        }}
      />
      
      {/* Countdown text - always red for better visibility */}
      {remaining > 100 && (
        <span
          className={cn(
            'text-[10px] sm:text-xs font-bold pixel-border px-1 transition-all duration-150',
            'text-destructive border-destructive',
            urgencyLevel === 'critical' 
              ? 'bg-destructive/60 animate-pulse' 
              : urgencyLevel === 'warning'
              ? 'bg-destructive/50'
              : 'bg-destructive/40'
          )}
          style={{
            imageRendering: 'pixelated',
            textShadow: isUrgent ? '0 0 8px rgba(255, 0, 0, 0.8)' : '0 0 4px rgba(255, 0, 0, 0.6)',
          }}
        >
          {Math.ceil(remaining / 100)}
        </span>
      )}

      {/* Urgent warning pulse overlay */}
      {isUrgent && (
        <div
          className={cn(
            'absolute inset-0 pointer-events-none',
            urgencyLevel === 'critical' ? 'bg-destructive/20 animate-pulse' : 'bg-accent/10'
          )}
          style={{
            borderRadius: '0',
          }}
        />
      )}
    </div>
  );
}

