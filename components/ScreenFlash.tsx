'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScreenFlashProps {
  type: 'error' | 'success' | 'warning';
  duration?: number;
}

/**
 * ScreenFlash component - Provides full-screen flash feedback
 */
export function ScreenFlash({ type, duration = 300 }: ScreenFlashProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!show) return null;

  const colorClass =
    type === 'error'
      ? 'bg-destructive/20 border-destructive'
      : type === 'success'
      ? 'bg-chart-3/20 border-chart-3'
      : 'bg-accent/20 border-accent';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 pointer-events-none',
        'border-8 pixel-border',
        colorClass,
        'screen-flash'
      )}
      style={{
        imageRendering: 'pixelated',
      }}
    />
  );
}

