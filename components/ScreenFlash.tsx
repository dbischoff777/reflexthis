'use client';

import { useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface ScreenFlashProps {
  type: 'error' | 'success' | 'warning' | 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50';
  duration?: number;
  highContrast?: boolean;
}

/**
 * ScreenFlash component - Provides full-screen flash feedback
 * Optimized with CSS animations for better performance
 */
export const ScreenFlash = memo(function ScreenFlash({ type, duration = 300, highContrast = false }: ScreenFlashProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [type, duration]);

  if (!isVisible) return null;

  // Combo milestone colors
  const getComboColor = (comboType: string) => {
    switch (comboType) {
      case 'combo-5':
        return { border: 'border-green-500', bg: highContrast ? 'bg-green-500/50' : 'bg-green-500/30' };
      case 'combo-10':
        return { border: 'border-cyan-500', bg: highContrast ? 'bg-cyan-500/50' : 'bg-cyan-500/30' };
      case 'combo-20':
        return { border: 'border-purple-500', bg: highContrast ? 'bg-purple-500/50' : 'bg-purple-500/30' };
      case 'combo-30':
        return { border: 'border-orange-500', bg: highContrast ? 'bg-orange-500/50' : 'bg-orange-500/30' };
      case 'combo-50':
        return { border: 'border-yellow-500', bg: highContrast ? 'bg-yellow-500/50' : 'bg-yellow-500/30' };
      default:
        return { border: 'border-accent', bg: highContrast ? 'bg-accent/40' : 'bg-accent/20' };
    }
  };

  const baseClass =
    type === 'error'
      ? 'border-destructive'
      : type === 'success'
      ? 'border-chart-3'
      : type.startsWith('combo-')
      ? getComboColor(type).border
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
      : type.startsWith('combo-')
      ? getComboColor(type).bg
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
        'screen-flash',
        'will-change-opacity'
      )}
      style={{
        imageRendering: 'pixelated',
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
    />
  );
});

