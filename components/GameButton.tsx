'use client';

import { memo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ButtonCountdown } from './ButtonCountdown';

export interface GameButtonProps {
  id: number;
  highlighted?: boolean;
  onPress?: () => void;
  highlightStartTime?: number;
  highlightDuration?: number;
}

/**
 * GameButton component - A circular button for the reflex game
 * Optimized for touch interactions on mobile devices with debouncing
 */
export const GameButton = memo(function GameButton({
  id,
  highlighted = false,
  onPress,
  highlightStartTime,
  highlightDuration,
}: GameButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPressTimeRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 100; // 100ms debounce to prevent spam

  // Debounced press handler
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastPressTimeRef.current < DEBOUNCE_DELAY) {
      return; // Ignore if pressed too soon
    }
    lastPressTimeRef.current = now;
    
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Handle touch start (faster response on mobile)
  // Note: We use onTouchStart directly without preventDefault to avoid passive listener issues
  // The CSS touch-action: manipulation already prevents double-tap zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      // Don't call preventDefault - CSS touch-action handles zoom prevention
      handlePress();
    },
    [handlePress]
  );

  return (
    <button
      ref={buttonRef}
      className={cn(
        'game-button relative min-w-[44px] min-h-[44px] w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
        'transition-all duration-100 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        'active:scale-95 touch-manipulation',
        'will-change-transform',
        'pixel-border',
        highlighted
          ? 'bg-primary border-primary animate-pixel-pulse'
          : 'bg-card border-border hover:border-primary hover:bg-primary/20'
      )}
      style={{
        imageRendering: 'pixelated' as any,
        borderRadius: '0',
      }}
      onClick={handlePress}
      onTouchStart={handleTouchStart}
      aria-label={`Game button ${id}`}
      aria-pressed={highlighted}
    >
      {/* Pixelated highlight effect when highlighted */}
      {highlighted && (
        <>
          <span
            className="absolute inset-0 bg-accent/50"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255, 255, 0, 0.1) 2px, rgba(255, 255, 0, 0.1) 4px)',
              imageRendering: 'pixelated',
              borderRadius: '0',
            }}
          />
          {highlightStartTime && highlightDuration !== undefined && highlightDuration > 0 && (
            <ButtonCountdown
              duration={highlightDuration}
              startTime={highlightStartTime}
            />
          )}
        </>
      )}
    </button>
  );
});

