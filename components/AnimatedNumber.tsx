'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  easing?: (x: number) => number;
  className?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

/**
 * Easing functions for smooth animations
 */
export const easingFunctions = {
  linear: (x: number) => x,
  easeOutCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  easeInOutCubic: (x: number) => x < 0.5
    ? 4 * x * x * x
    : 1 - Math.pow(-2 * x + 2, 3) / 2,
  easeOutQuad: (x: number) => 1 - (1 - x) * (1 - x),
  easeInOutQuad: (x: number) => x < 0.5
    ? 2 * x * x
    : 1 - Math.pow(-2 * x + 2, 2) / 2,
};

/**
 * AnimatedNumber component - Smoothly animates number changes
 * Uses requestAnimationFrame for smooth 60fps animations
 * Respects reduced motion preferences
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  easing = easingFunctions.easeOutCubic,
  className,
  formatValue = (v) => Math.round(v).toString(),
  disabled = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // If disabled or reduced motion, update immediately
    if (disabled || prefersReducedMotion) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    // If value hasn't changed, no animation needed
    if (value === previousValueRef.current) {
      return;
    }

    const start = previousValueRef.current;
    const end = value;
    const difference = end - start;

    // Cancel any existing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Start animation
    const startTime = performance.now();
    startTimeRef.current = startTime;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) return;

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const current = start + difference * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setDisplayValue(end);
        previousValueRef.current = end;
        animationFrameRef.current = null;
        startTimeRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [value, duration, easing, disabled, prefersReducedMotion]);

  return (
    <span className={cn('inline-block', className)}>
      {formatValue(displayValue)}
    </span>
  );
}

