/**
 * Example implementation showing how to integrate combo rating system
 * 
 * This file demonstrates two approaches:
 * 1. Simple mode - Uses only combo count and difficulty
 * 2. Advanced mode - Uses combo count, reaction times, and perfect hits
 * 
 * Choose the approach that fits your needs and integrate into ComboDisplay.tsx
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getComboMultiplier } from '@/lib/gameUtils';
import { 
  getSimpleComboRating, 
  getRatingDisplay,
  calculateComboRating,
  type ComboRating 
} from '@/lib/comboRating';
import type { DifficultyPreset } from '@/lib/difficulty';
import type { ReactionTimeStats } from '@/lib/GameContext';

// ============================================================================
// SIMPLE MODE - Easy to implement, uses only combo count
// ============================================================================

interface SimpleComboDisplayProps {
  combo: number;
  difficulty: DifficultyPreset;
  reducedEffects?: boolean;
}

export function SimpleComboDisplayWithRating({ 
  combo, 
  difficulty,
  reducedEffects = false,
}: SimpleComboDisplayProps) {
  const [displayCombo, setDisplayCombo] = useState(combo);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentRating, setCurrentRating] = useState<ComboRating>('D');
  const [previousRating, setPreviousRating] = useState<ComboRating>('D');
  const previousComboRef = useRef(combo);

  // Calculate rating
  const rating = getSimpleComboRating(combo, difficulty);
  const ratingDisplay = getRatingDisplay(rating);

  // Animate when combo or rating changes
  useEffect(() => {
    if (combo > previousComboRef.current) {
      setIsAnimating(true);
      setDisplayCombo(combo);
      
      // Check for rating upgrade
      if (rating !== currentRating) {
        setPreviousRating(currentRating);
        setCurrentRating(rating);
        // Could trigger special animation/sound here
      }
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (combo === 0) {
      setDisplayCombo(0);
      setIsAnimating(false);
      setCurrentRating('D');
    }
    
    previousComboRef.current = combo;
  }, [combo, rating, currentRating]);

  if (combo === 0) return null;

  const fontSize = combo < 10 
    ? 'text-2xl sm:text-3xl' 
    : combo < 50 
    ? 'text-3xl sm:text-4xl' 
    : 'text-4xl sm:text-5xl';

  return (
    <div className="flex flex-col gap-1 items-center justify-center">
      <span className="hud-label text-xs opacity-80">COMBO</span>
      
      {/* Rating Badge */}
      <div
        className={cn(
          'text-lg sm:text-xl font-bold px-2 py-0.5 rounded',
          rating !== currentRating && !reducedEffects && 'rating-upgrade-animation'
        )}
        style={{
          color: ratingDisplay.color,
          textShadow: `0 0 ${ratingDisplay.glowIntensity * 8}px ${ratingDisplay.color}`,
          backgroundColor: `${ratingDisplay.color}15`,
          border: `1px solid ${ratingDisplay.color}40`,
        }}
      >
        {ratingDisplay.label}
      </div>
      
      {/* Combo Number */}
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
    </div>
  );
}

// ============================================================================
// ADVANCED MODE - Uses reaction time data for more accurate ratings
// ============================================================================

interface AdvancedComboDisplayProps {
  combo: number;
  difficulty: DifficultyPreset;
  reactionTimeStats: ReactionTimeStats;
  reducedEffects?: boolean;
}

export function AdvancedComboDisplayWithRating({ 
  combo, 
  difficulty,
  reactionTimeStats,
  reducedEffects = false,
}: AdvancedComboDisplayProps) {
  const [displayCombo, setDisplayCombo] = useState(combo);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentRating, setCurrentRating] = useState<ComboRating>('D');
  const previousComboRef = useRef(combo);

  // Calculate perfect hits
  const perfectHitCount = reactionTimeStats.allTimes.filter(t => t < 150).length;
  const totalHits = reactionTimeStats.allTimes.length;

  // Calculate detailed rating
  const ratingResult = calculateComboRating({
    combo,
    averageReactionTime: reactionTimeStats.average,
    perfectHitCount,
    totalHits,
    difficulty,
  });

  const ratingDisplay = getRatingDisplay(ratingResult.rating);

  // Animate when combo increases
  useEffect(() => {
    if (combo > previousComboRef.current) {
      setIsAnimating(true);
      setDisplayCombo(combo);
      
      // Check for rating upgrade
      if (ratingResult.rating !== currentRating) {
        setCurrentRating(ratingResult.rating);
        // Could trigger special animation/sound here
      }
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (combo === 0) {
      setDisplayCombo(0);
      setIsAnimating(false);
      setCurrentRating('D');
    }
    
    previousComboRef.current = combo;
  }, [combo, ratingResult.rating, currentRating]);

  if (combo === 0) return null;

  const fontSize = combo < 10 
    ? 'text-2xl sm:text-3xl' 
    : combo < 50 
    ? 'text-3xl sm:text-4xl' 
    : 'text-4xl sm:text-5xl';

  return (
    <div className="flex flex-col gap-1 items-center justify-center">
      <span className="hud-label text-xs opacity-80">COMBO</span>
      
      {/* Rating Badge with Score */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            'text-lg sm:text-xl font-bold px-2 py-0.5 rounded',
            ratingResult.rating !== currentRating && !reducedEffects && 'rating-upgrade-animation'
          )}
          style={{
            color: ratingDisplay.color,
            textShadow: `0 0 ${ratingDisplay.glowIntensity * 8}px ${ratingDisplay.color}`,
            backgroundColor: `${ratingDisplay.color}15`,
            border: `1px solid ${ratingDisplay.color}40`,
          }}
        >
          {ratingDisplay.label}
        </div>
        
        {/* Optional: Show progress to next rating */}
        {ratingResult.nextRatingThreshold && (
          <div className="text-[0.6rem] opacity-60">
            {ratingResult.nextRatingThreshold - ratingResult.score} to next
          </div>
        )}
      </div>
      
      {/* Combo Number */}
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
    </div>
  );
}

