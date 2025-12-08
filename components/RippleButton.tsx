'use client';

import { ReactNode, MouseEvent, useState, useRef, useEffect, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface RippleButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  rippleColor?: string;
  rippleDuration?: number;
  disabledRipple?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLButtonElement>) => void;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

/**
 * RippleButton component - Adds click ripple effects to buttons
 * Respects reduced motion preferences
 */
export function RippleButton({
  children,
  onClick,
  className,
  style,
  disabled = false,
  type = 'button',
  rippleColor = 'rgba(255, 255, 255, 0.5)',
  rippleDuration = 600,
  disabledRipple = false,
  onMouseEnter,
  onMouseLeave,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled || disabledRipple || prefersReducedMotion) {
      onClick?.(e);
      return;
    }

    const button = buttonRef.current;
    if (!button) {
      onClick?.(e);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      x,
      y,
      id: rippleIdRef.current++,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, rippleDuration);

    onClick?.(e);
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative overflow-hidden',
        'transition-all duration-200 ease-out',
        'active:scale-95',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        transform: 'translateZ(0)',
        ...style,
      }}
    >
      {children}
      {!prefersReducedMotion && !disabledRipple && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            transform: 'translate(-50%, -50%)',
            backgroundColor: rippleColor,
            animation: `ripple ${rippleDuration}ms ease-out`,
          }}
        />
      ))}
    </button>
  );
}

