'use client';

import { useEffect, useRef } from 'react';

type MobileGesturesProps = {
  enabled: boolean;
  threshold?: number;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

/**
 * Lightweight gesture layer for mobile devices.
 * Listens globally but ignores touches that originate on game buttons/canvas.
 */
export function MobileGestures({
  enabled,
  threshold = 50,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
}: MobileGesturesProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('.game-button') ||
        target.closest('canvas') ||
        target.closest('[data-gestures-ignore]')
      );
    };

    const handleStart = (event: TouchEvent) => {
      if (!enabled) return;
      if (isInteractiveTarget(event.target)) return;
      if (event.touches.length !== 1) return;

      tracking.current = true;
      startX.current = event.touches[0].clientX;
      startY.current = event.touches[0].clientY;
    };

    const handleEnd = (event: TouchEvent) => {
      if (!enabled || !tracking.current) return;
      tracking.current = false;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && onSwipeRight) onSwipeRight();
        else if (dx < 0 && onSwipeLeft) onSwipeLeft();
      } else {
        if (dy < 0 && onSwipeUp) onSwipeUp();
        else if (dy > 0 && onSwipeDown) onSwipeDown();
      }
    };

    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [enabled, threshold, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight]);

  return null;
}

