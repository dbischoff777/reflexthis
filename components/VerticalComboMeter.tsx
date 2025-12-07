'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getSimpleComboRating, getRatingDisplay, type ComboRating } from '@/lib/comboRating';
import type { DifficultyPreset } from '@/lib/difficulty';

interface VerticalComboMeterProps {
  combo: number;
  difficulty: DifficultyPreset;
  reducedEffects?: boolean;
  position?: 'left' | 'right';
}

/**
 * Vertical Combo Meter with Rating System
 * 
 * Features:
 * - Vertical progress bar that fills as combo increases
 * - Rating badge (D, C, B, A, A+, S, SS, SSS) at the top
 * - Combo number display
 * - Smooth animations and color transitions
 * - Positioned on left or right side of game area
 */
export function VerticalComboMeter({
  combo,
  difficulty,
  reducedEffects = false,
  position = 'right',
}: VerticalComboMeterProps) {
  const [displayCombo, setDisplayCombo] = useState(combo);
  const [currentRating, setCurrentRating] = useState<ComboRating>('D');
  const [previousRating, setPreviousRating] = useState<ComboRating>('D');
  const [isRatingUpgrading, setIsRatingUpgrading] = useState(false);
  const [isComboIncreasing, setIsComboIncreasing] = useState(false);
  const [comboPulse, setComboPulse] = useState(false);
  const previousComboRef = useRef(combo);

  // Calculate rating
  const rating = getSimpleComboRating(combo, difficulty);
  const ratingDisplay = getRatingDisplay(rating);

  // Calculate fill percentage (0-100%)
  // Cap at 100 combos for visual purposes (SSS rating threshold)
  const maxComboForMeter = 100;
  const fillPercentage = Math.min((combo / maxComboForMeter) * 100, 100);

  // Animate when combo or rating changes
  useEffect(() => {
    if (combo > previousComboRef.current) {
      setDisplayCombo(combo);
      setIsComboIncreasing(true);
      setComboPulse(true);
      
      // Reset combo increase animation
      const comboTimer = setTimeout(() => {
        setIsComboIncreasing(false);
      }, 400);
      
      // Reset pulse animation
      const pulseTimer = setTimeout(() => {
        setComboPulse(false);
      }, 600);
      
      // Check for rating upgrade
      if (rating !== currentRating) {
        setPreviousRating(currentRating);
        setCurrentRating(rating);
        setIsRatingUpgrading(true);
        
        // Reset upgrade animation after completion
        const upgradeTimer = setTimeout(() => {
          setIsRatingUpgrading(false);
        }, 1000);
        
        return () => {
          clearTimeout(comboTimer);
          clearTimeout(pulseTimer);
          clearTimeout(upgradeTimer);
        };
      }
      
      return () => {
        clearTimeout(comboTimer);
        clearTimeout(pulseTimer);
      };
    } else if (combo === 0) {
      setDisplayCombo(0);
      setCurrentRating('D');
      setIsRatingUpgrading(false);
      setIsComboIncreasing(false);
      setComboPulse(false);
    }
    
    previousComboRef.current = combo;
  }, [combo, rating, currentRating]);

  // Don't show if combo is 0
  if (combo === 0) return null;

  return (
    <div
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-20',
        'flex flex-col items-center',
        'w-16 sm:w-20 md:w-24',
        position === 'left' ? 'left-2 sm:left-4 md:left-6' : 'right-2 sm:right-4 md:right-6'
      )}
    >
      {/* Rating Badge - Top */}
      <div
        className={cn(
          'mb-2 px-2 py-1 rounded relative overflow-hidden',
          'text-sm sm:text-base md:text-lg font-bold',
          'border-2 pixel-border',
          'transition-all duration-300',
          isRatingUpgrading && !reducedEffects && 'rating-upgrade-animation',
          isComboIncreasing && !reducedEffects && 'rating-badge-pulse'
        )}
        style={{
          color: ratingDisplay.color,
          backgroundColor: `${ratingDisplay.color}20`,
          borderColor: ratingDisplay.color,
          textShadow: `0 0 ${ratingDisplay.glowIntensity * 10}px ${ratingDisplay.color}`,
          boxShadow: `0 0 ${ratingDisplay.glowIntensity * 15}px ${ratingDisplay.color}40`,
        }}
      >
        {/* Shimmer effect overlay */}
        {!reducedEffects && isRatingUpgrading && (
          <div
            className="absolute inset-0 rating-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent, ${ratingDisplay.color}60, transparent)`,
            }}
          />
        )}
        <span className="relative z-10">{ratingDisplay.label}</span>
      </div>

      {/* Vertical Meter Container */}
      <div
        className={cn(
          'relative w-8 sm:w-10 md:w-12',
          'h-[40vh] sm:h-[50vh] md:h-[60vh]',
          'max-h-[600px] min-h-[200px]',
          'border-2 pixel-border rounded',
          'bg-black/40',
          'overflow-hidden',
          'transition-all duration-500',
          comboPulse && !reducedEffects && 'meter-container-pulse',
          isRatingUpgrading && !reducedEffects && 'meter-container-shake'
        )}
        style={{
          borderColor: ratingDisplay.color + '60',
          boxShadow: `0 0 ${ratingDisplay.glowIntensity * 20}px ${ratingDisplay.color}30`,
        }}
      >
        {/* Meter Fill */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0',
            'transition-all duration-500 ease-out',
            isComboIncreasing && !reducedEffects && 'meter-fill-ripple'
          )}
          style={{
            height: `${fillPercentage}%`,
            background: `linear-gradient(to top, ${ratingDisplay.color}80, ${ratingDisplay.color}40, ${ratingDisplay.color}20)`,
            boxShadow: `0 0 ${ratingDisplay.glowIntensity * 20}px ${ratingDisplay.color}60 inset`,
          }}
        >
          {/* Animated glow effect */}
          {!reducedEffects && (
            <>
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(to top, transparent, ${ratingDisplay.color}60)`,
                  animation: 'meter-glow 2s ease-in-out infinite',
                }}
              />
              {/* Ripple effect at fill level */}
              {isComboIncreasing && (
                <div
                  className="absolute top-0 left-0 right-0 h-2 meter-ripple"
                  style={{
                    background: `radial-gradient(ellipse at center, ${ratingDisplay.color}80, transparent)`,
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Combo Number - Centered in meter */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'text-xl sm:text-2xl md:text-3xl font-bold',
            'drop-shadow-[0_0_8px_currentColor]',
            'transition-all duration-300',
            isComboIncreasing && !reducedEffects && 'combo-number-pop',
            comboPulse && !reducedEffects && 'combo-number-pulse'
          )}
          style={{
            color: ratingDisplay.color,
            textShadow: `0 0 10px ${ratingDisplay.color}, 0 0 20px ${ratingDisplay.color}80, 2px 2px 0 rgba(0,0,0,0.9)`,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
          }}
        >
          {displayCombo}
        </div>

        {/* Rating Threshold Markers (optional, subtle) */}
        {!reducedEffects && (
          <div className="absolute inset-0 pointer-events-none">
            {/* S threshold marker (50 combo) */}
            <div
              className="absolute w-full h-px opacity-30"
              style={{
                backgroundColor: ratingDisplay.color,
                bottom: '50%', // 50 combo = S rating
              }}
            />
            {/* A+ threshold marker (35 combo) */}
            <div
              className="absolute w-full h-px opacity-20"
              style={{
                backgroundColor: ratingDisplay.color,
                bottom: '35%', // 35 combo = A+ rating
              }}
            />
          </div>
        )}
      </div>

      {/* Multiplier indicator - Bottom */}
      {combo >= 5 && (
        <div
          className="mt-2 text-xs sm:text-sm font-bold opacity-80"
          style={{
            color: ratingDisplay.color,
            textShadow: `0 0 6px ${ratingDisplay.color}`,
          }}
        >
          ×{Math.min(Math.floor(combo / 5) + 1, 5)}
        </div>
      )}
    </div>
  );
}

