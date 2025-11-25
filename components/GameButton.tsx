'use client';

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ButtonCountdown } from './ButtonCountdown';
import { triggerHaptic } from '@/lib/hapticUtils';

export interface GameButtonProps {
  id: number;
  highlighted?: boolean;
  onPress?: () => void;
  highlightStartTime?: number;
  highlightDuration?: number;
  pressFeedback?: 'correct' | 'incorrect' | null;
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
  pressFeedback,
}: GameButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPressTimeRef = useRef<number>(0);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);
  const DEBOUNCE_DELAY = 100; // 100ms debounce to prevent spam

  // Reset press feedback and scale after animation
  useEffect(() => {
    if (pressFeedback) {
      const timer = setTimeout(() => {
        setIsPressed(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pressFeedback]);

  // Reset scale when highlight is removed
  useEffect(() => {
    if (!highlighted && !pressFeedback) {
      setIsPressed(false);
    }
  }, [highlighted, pressFeedback]);

  // Debounced press handler with haptic feedback
  const handlePress = useCallback((event?: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (now - lastPressTimeRef.current < DEBOUNCE_DELAY) {
      return; // Ignore if pressed too soon
    }
    lastPressTimeRef.current = now;
    
    // Trigger haptic feedback
    triggerHaptic('light');
    
    // Set pressed state for scale animation
    setIsPressed(true);
    
    // Calculate ripple position
    if (buttonRef.current && event) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = 'touches' in event 
        ? event.touches[0].clientX - rect.left
        : event.clientX - rect.left;
      const y = 'touches' in event
        ? event.touches[0].clientY - rect.top
        : event.clientY - rect.top;
      setRipplePosition({ x, y });
      
      // Clear ripple position after animation
      setTimeout(() => setRipplePosition(null), 600);
    }
    
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
      handlePress(e);
    },
    [handlePress]
  );

  // Handle click for desktop
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      handlePress(e);
    },
    [handlePress]
  );

  // Determine button state classes
  const getButtonStateClasses = () => {
    if (pressFeedback === 'correct') {
      return 'bg-chart-3 border-chart-3 animate-pulse-glow';
    }
    if (pressFeedback === 'incorrect') {
      return 'bg-destructive border-destructive animate-shake';
    }
    if (highlighted) {
      return 'bg-primary border-primary animate-pixel-pulse';
    }
    return 'bg-card border-border hover:border-primary hover:bg-primary/20';
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        'game-button relative min-w-[44px] min-h-[44px] w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        'touch-manipulation',
        'will-change-transform',
        'pixel-border overflow-hidden',
        getButtonStateClasses(),
        // Only apply scale-90 when pressed
        isPressed && 'scale-90'
      )}
      style={{
        imageRendering: 'pixelated' as any,
        borderRadius: '0',
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      aria-label={`Game button ${id}`}
      aria-pressed={highlighted}
    >
      {/* Ripple effect on press */}
      {ripplePosition && (
        <span
          ref={rippleRef}
          className="absolute pointer-events-none z-30 animate-ripple"
          style={{
            left: ripplePosition.x,
            top: ripplePosition.y,
            width: '0',
            height: '0',
            borderRadius: '50%',
            background: pressFeedback === 'correct' 
              ? 'rgba(0, 255, 0, 0.4)' 
              : pressFeedback === 'incorrect'
              ? 'rgba(255, 0, 0, 0.4)'
              : 'rgba(0, 255, 255, 0.3)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Color flash overlay for correct/incorrect */}
      {pressFeedback && (
        <span
          className={cn(
            'absolute inset-0 pointer-events-none z-20 transition-opacity duration-300',
            pressFeedback === 'correct' 
              ? 'bg-chart-3/60' 
              : 'bg-destructive/60'
          )}
          style={{
            animation: pressFeedback === 'correct' 
              ? 'flash-success 0.3s ease-out' 
              : 'flash-error 0.3s ease-out',
          }}
        />
      )}

      {/* Enhanced highlight effect when highlighted */}
      {highlighted && (
        <>
          {/* Inner glow overlay */}
          <span
            className="absolute inset-0 z-10"
            style={{
              background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.3) 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)',
              imageRendering: 'pixelated',
              borderRadius: '0',
            }}
          />
          {/* Subtle pattern overlay */}
          <span
            className="absolute inset-0 bg-accent/30 z-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255, 255, 0, 0.08) 2px, rgba(255, 255, 0, 0.08) 4px)',
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
      
      {/* Inner bevel highlight - top-left light, bottom-right shadow */}
      <span
        className="absolute inset-0 pointer-events-none z-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.3) 100%)',
          borderRadius: '0',
          imageRendering: 'pixelated',
        }}
      />
    </button>
  );
});

