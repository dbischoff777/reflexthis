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
      {/* Progress ring around button - always red/orange for visibility against cyan buttons */}
      <svg
        className="absolute inset-0 w-full h-full transform -rotate-90"
        style={{ 
          filter: urgencyLevel === 'critical' 
            ? 'drop-shadow(0 0 6px rgba(255, 0, 0, 0.8))' 
            : urgencyLevel === 'warning'
            ? 'drop-shadow(0 0 4px rgba(255, 136, 0, 0.6))'
            : 'drop-shadow(0 0 3px rgba(255, 0, 0, 0.4))'
        }}
      >
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={urgencyLevel === 'critical' ? '#ff0000' : urgencyLevel === 'warning' ? '#ff8800' : '#ff3333'}
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

      {/* Progress indicator - top border that shrinks - red tones for visibility */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-150"
        style={{
          backgroundColor: urgencyLevel === 'critical' ? '#ff0000' : urgencyLevel === 'warning' ? '#ff8800' : '#ff3333',
          transform: `scaleX(${progress / 100})`,
          transformOrigin: 'left',
          boxShadow: isUrgent 
            ? '0 0 8px rgba(255, 0, 0, 0.8), 0 0 4px rgba(255, 0, 0, 0.4)' 
            : '0 0 4px rgba(255, 0, 0, 0.3)',
        }}
      />
      
      {/* Bottom border indicator - red tones for visibility */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1.5 transition-all duration-150"
        style={{
          backgroundColor: urgencyLevel === 'critical' ? '#ff0000' : urgencyLevel === 'warning' ? '#ff8800' : '#ff3333',
          transform: `scaleX(${progress / 100})`,
          transformOrigin: 'right',
          boxShadow: isUrgent 
            ? '0 0 8px rgba(255, 0, 0, 0.8), 0 0 4px rgba(255, 0, 0, 0.4)' 
            : '0 0 4px rgba(255, 0, 0, 0.3)',
        }}
      />
      
      {/* Countdown text - always red with dark background for maximum visibility */}
      {remaining > 100 && (
        <span
          className={cn(
            'text-[10px] sm:text-xs font-bold pixel-border px-1.5 py-0.5 transition-all duration-150',
            'text-white border-red-600',
            urgencyLevel === 'critical' 
              ? 'bg-red-600/90 animate-pulse' 
              : urgencyLevel === 'warning'
              ? 'bg-red-600/80'
              : 'bg-red-600/70'
          )}
          style={{
            imageRendering: 'pixelated',
            textShadow: isUrgent 
              ? '0 0 10px rgba(255, 0, 0, 1), 0 0 5px rgba(255, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 1)' 
              : '0 0 6px rgba(255, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.8)',
            borderColor: urgencyLevel === 'critical' ? '#ff0000' : urgencyLevel === 'warning' ? '#ff8800' : '#ff3333',
          }}
        >
          {Math.ceil(remaining / 100)}
        </span>
      )}

      {/* Urgent warning pulse overlay - red tones to avoid conflict with cyan buttons */}
      {isUrgent && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            borderRadius: '0',
            backgroundColor: urgencyLevel === 'critical' 
              ? 'rgba(255, 0, 0, 0.15)' 
              : 'rgba(255, 136, 0, 0.1)',
          }}
        />
      )}
    </div>
  );
}

