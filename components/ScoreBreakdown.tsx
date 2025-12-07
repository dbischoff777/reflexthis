'use client';

import { useEffect, useState } from 'react';
import { ScoringFactors } from '@/lib/scoring';
import { cn } from '@/lib/utils';

interface ScoreBreakdownProps {
  breakdown: ScoringFactors | null;
  onAnimationComplete?: () => void;
}

/**
 * ScoreBreakdown component - Shows real-time score breakdown visualization
 */
export function ScoreBreakdown({
  breakdown,
  onAnimationComplete,
}: ScoreBreakdownProps) {
  const [show, setShow] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<ScoringFactors | null>(null);

  useEffect(() => {
    if (breakdown && breakdown.totalScore > 0) {
      setShow(true);
      // Animate values from 0 to target
      const duration = 800; // 800ms animation
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const animate = () => {
        if (currentStep >= steps) {
          setAnimatedValues(breakdown);
          // Hide after showing for a bit
          setTimeout(() => {
            setShow(false);
            setAnimatedValues(null);
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }, 2000);
          return;
        }

        const progress = currentStep / steps;
        // Ease-out animation
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedValues({
          baseScore: Math.floor(breakdown.baseScore * eased),
          comboMultiplier: breakdown.comboMultiplier,
          accuracyBonus: Math.floor(breakdown.accuracyBonus * eased),
          consistencyBonus: Math.floor(breakdown.consistencyBonus * eased),
          difficultyMultiplier: breakdown.difficultyMultiplier,
          modeMultiplier: breakdown.modeMultiplier,
          totalScore: Math.floor(breakdown.totalScore * eased),
        });

        currentStep++;
        setTimeout(animate, stepDuration);
      };

      animate();
    } else {
      setShow(false);
      setAnimatedValues(null);
    }
  }, [breakdown, onAnimationComplete]);

  if (!show || !animatedValues) return null;

  const hasBonuses = animatedValues.accuracyBonus > 0 || animatedValues.consistencyBonus > 0;
  const hasMultipliers = animatedValues.comboMultiplier > 1 || animatedValues.difficultyMultiplier !== 1 || animatedValues.modeMultiplier !== 1;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
        'bg-card/95 border-4 border-primary pixel-border',
        'px-4 py-3 min-w-[280px] max-w-[400px]',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
      style={{ imageRendering: 'pixelated' }}
    >
      <div className="text-center space-y-2">
        {/* Total Score */}
        <div className="text-2xl font-bold text-primary">
          +{animatedValues.totalScore.toLocaleString()} pts
        </div>

        {/* Breakdown */}
        <div className="text-xs space-y-1 text-muted-foreground">
          {/* Base Score */}
          <div className="flex justify-between items-center">
            <span>Base:</span>
            <span className="font-semibold text-foreground">{animatedValues.baseScore}</span>
          </div>

          {/* Multipliers */}
          {hasMultipliers && (
            <div className="pt-1 border-t border-primary/30">
              {animatedValues.comboMultiplier > 1 && (
                <div className="flex justify-between items-center">
                  <span>Combo:</span>
                  <span className="font-semibold text-chart-1">
                    {animatedValues.comboMultiplier.toFixed(1)}x
                  </span>
                </div>
              )}
              {animatedValues.difficultyMultiplier !== 1 && (
                <div className="flex justify-between items-center">
                  <span>Difficulty:</span>
                  <span className="font-semibold text-chart-2">
                    {animatedValues.difficultyMultiplier.toFixed(1)}x
                  </span>
                </div>
              )}
              {animatedValues.modeMultiplier !== 1 && (
                <div className="flex justify-between items-center">
                  <span>Mode:</span>
                  <span className="font-semibold text-chart-3">
                    {animatedValues.modeMultiplier.toFixed(1)}x
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bonuses */}
          {hasBonuses && (
            <div className="pt-1 border-t border-primary/30">
              {animatedValues.accuracyBonus > 0 && (
                <div className="flex justify-between items-center">
                  <span>Perfect Streak:</span>
                  <span className="font-semibold text-chart-4">
                    +{animatedValues.accuracyBonus}
                  </span>
                </div>
              )}
              {animatedValues.consistencyBonus > 0 && (
                <div className="flex justify-between items-center">
                  <span>Consistency:</span>
                  <span className="font-semibold text-chart-5">
                    +{animatedValues.consistencyBonus}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

