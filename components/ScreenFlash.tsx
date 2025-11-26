'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScreenFlashProps {
  type: 'error' | 'success' | 'warning';
  duration?: number;
  highContrast?: boolean;
}

/**
 * ScreenFlash component - Provides full-screen flash feedback
 */
export function ScreenFlash({ type, duration = 300, highContrast = false }: ScreenFlashProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!show) return null;

  const baseClass =
    type === 'error'
      ? 'border-destructive'
      : type === 'success'
      ? 'border-chart-3'
      : 'border-accent';

  const bgClass =
    type === 'error'
      ? highContrast
        ? 'bg-destructive/40'
        : 'bg-destructive/20'
      : type === 'success'
      ? highContrast
        ? 'bg-chart-3/40'
        : 'bg-chart-3/20'
      : highContrast
      ? 'bg-accent/40'
      : 'bg-accent/20';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 pointer-events-none',
        'border-8 pixel-border',
        baseClass,
        bgClass,
        'screen-flash'
      )}
      style={{
        imageRendering: 'pixelated',
      }}
    />
  );
}

