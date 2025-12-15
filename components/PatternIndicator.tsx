'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PatternType } from '@/lib/patternGenerator';

interface PatternIndicatorProps {
  patternType: PatternType | null;
  bonusMultiplier: number;
  onComplete?: () => void;
}

const PATTERN_NAMES: Record<PatternType, string> = {
  'line-horizontal': 'HORIZONTAL LINE',
  'line-vertical': 'VERTICAL LINE',
  'line-diagonal': 'DIAGONAL LINE',
  'shape-l': 'L-SHAPE',
  'shape-t': 'T-SHAPE',
  'shape-cross': 'CROSS',
  'shape-corner': 'CORNER',
  'sweep-left-right': 'SWEEP',
  'sweep-top-bottom': 'SWEEP',
  'cluster': 'CLUSTER',
  'random': '',
};

const PATTERN_ICONS: Record<PatternType, string> = {
  'line-horizontal': '━',
  'line-vertical': '┃',
  'line-diagonal': '╲',
  'shape-l': '┗',
  'shape-t': '┳',
  'shape-cross': '╋',
  'shape-corner': '┏',
  'sweep-left-right': '→',
  'sweep-top-bottom': '↓',
  'cluster': '●',
  'random': '',
};

export function PatternIndicator({ patternType, bonusMultiplier, onComplete }: PatternIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!patternType || patternType === 'random') {
      setIsVisible(false);
      return;
    }

    // Show pattern indicator
    setIsVisible(true);
    setIsExiting(false);

    // Hide after 2 seconds
    const hideTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, 2000);

    return () => clearTimeout(hideTimer);
  }, [patternType, onComplete]);

  if (!isVisible || !patternType || patternType === 'random') return null;

  const patternName = PATTERN_NAMES[patternType];
  const patternIcon = PATTERN_ICONS[patternType];
  const bonusPercent = Math.round((bonusMultiplier - 1) * 100);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      <div
        className={cn(
          'px-4 py-2 border-2 pixel-border shadow-lg transition-all duration-300',
          'bg-black/90 border-primary',
          isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(0, 255, 255, 0.2)',
        }}
      >
        <div className="flex items-center gap-3 text-primary font-bold">
          {patternIcon && (
            <span className="text-2xl sm:text-3xl" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }}>
              {patternIcon}
            </span>
          )}
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm md:text-base text-glow">{patternName}</span>
            {bonusPercent > 0 && (
              <span className="text-xs text-secondary" style={{ textShadow: '0 0 8px rgba(255, 0, 255, 0.6)' }}>
                +{bonusPercent}% BONUS
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

