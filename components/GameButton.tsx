'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface GameButtonProps {
  id: number;
  highlighted?: boolean;
  onPress?: () => void;
}

/**
 * GameButton component - A circular button for the reflex game
 * Optimized for touch interactions on mobile devices with debouncing
 */
export const GameButton = memo(function GameButton({
  id,
  highlighted = false,
  onPress,
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
        'game-button relative min-w-[44px] min-h-[44px] w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        'active:scale-90 touch-manipulation',
        'will-change-transform',
        highlighted
          ? 'bg-primary shadow-glow animate-pulse-glow border-2 border-primary'
          : 'bg-card border-2 border-border hover:border-primary/50 hover:bg-card/80'
      )}
      onClick={handlePress}
      onTouchStart={handleTouchStart}
      aria-label={`Game button ${id}`}
      aria-pressed={highlighted}
    >
      {/* Inner glow effect when highlighted */}
      {highlighted && (
        <span
          className="absolute inset-0 rounded-full bg-primary/30 animate-pulse"
          style={{
            boxShadow: 'inset 0 0 20px rgba(0, 255, 255, 0.5)',
          }}
        />
      )}
    </button>
  );
});

