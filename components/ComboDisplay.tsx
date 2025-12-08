'use client';

import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { getComboMultiplier } from '@/lib/gameUtils';

interface ComboDisplayProps {
  combo: number;
  reducedEffects?: boolean;
}

/**
 * Guilty Gear Strive-inspired ComboDisplay component
 * Features:
 * - Dynamic scaling based on combo value (capped to prevent distraction)
 * - Smooth pop animation when combo increases
 * - Large, prominent numbers
 * - Strategic placement in HUD
 * Optimized with React.memo and useMemo to prevent unnecessary re-renders
 */
export const ComboDisplay = memo(function ComboDisplay({ 
  combo, 
  reducedEffects = false,
}: ComboDisplayProps) {
  const [displayCombo, setDisplayCombo] = useState(combo);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousComboRef = useRef(combo);

  // Memoize expensive calculations
  const multiplier = useMemo(() => getComboMultiplier(combo), [combo]);
  
  // Calculate dynamic scale based on combo (capped at 1.4x to avoid distraction)
  const scale = useMemo(() => {
    if (combo <= 0) return 1;
    // Scale from 1.0 to 1.4 based on combo, with diminishing returns
    // Formula: 1 + (combo / 100) * 0.4, capped at 1.4
    return Math.min(1 + (combo / 100) * 0.4, 1.4);
  }, [combo]);
  
  const fontSize = useMemo(() => {
    if (combo < 10) return 'text-2xl sm:text-3xl';
    if (combo < 50) return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  }, [combo]);

  // Animate when combo increases
  useEffect(() => {
    if (combo > previousComboRef.current) {
      setIsAnimating(true);
      setDisplayCombo(combo);
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (combo === 0) {
      setDisplayCombo(0);
      setIsAnimating(false);
    }
    
    previousComboRef.current = combo;
  }, [combo]);

  if (combo === 0) return null;

  return (
    <div className="flex flex-col gap-1 items-center justify-center">
      <span className="hud-label text-xs opacity-80">COMBO</span>
      <div 
        className="relative"
        style={{
          transform: `scale(${reducedEffects ? 1 : scale})`,
          transition: reducedEffects ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className={cn(
            fontSize,
            'font-bold text-accent drop-shadow-[0_0_8px_currentColor]',
            isAnimating && !reducedEffects && 'combo-pop-animation'
          )}
          style={{
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 2px 2px 0 rgba(0,0,0,0.8)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}
        >
          {displayCombo}
        </div>
        {multiplier > 1 && (
          <div
            className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs sm:text-sm font-bold text-accent/80"
            style={{
              textShadow: '0 0 6px currentColor',
            }}
          >
            ×{multiplier}
          </div>
        )}
      </div>
    </div>
  );
});
