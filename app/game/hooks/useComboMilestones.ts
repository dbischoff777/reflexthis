'use client';

import { useState, useRef, useEffect } from 'react';
import { playSound } from '@/lib/soundUtils';

interface UseComboMilestonesOptions {
  combo: number;
  soundEnabled: boolean;
  screenFlashEnabled: boolean;
  reducedEffects: boolean;
  setScreenFlash: (flash: 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' | null) => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimer: (timer: NodeJS.Timeout) => void;
}

export function useComboMilestones({
  combo,
  soundEnabled,
  screenFlashEnabled,
  reducedEffects,
  setScreenFlash,
  setTimer,
  clearTimer,
}: UseComboMilestonesOptions) {
  const [comboMilestone, setComboMilestone] = useState<number | null>(null);
  const lastMilestoneRef = useRef<number>(0);
  const previousComboRef = useRef(0);

  // Detect combo milestones - Expanded list: 5, 10, 15, 20, 25, 30, 40, 50, 75, 100
  useEffect(() => {
    const milestones = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
    
    // Check if we crossed a new milestone threshold
    for (const milestone of milestones) {
      if (combo >= milestone && previousComboRef.current < milestone && milestone > lastMilestoneRef.current) {
        lastMilestoneRef.current = milestone;
        setComboMilestone(milestone);
        
        // Play combo sound
        playSound('combo', soundEnabled);
        
        // Trigger screen flash for combo milestone
        let flashTimer: NodeJS.Timeout | null = null;
        if (screenFlashEnabled) {
          // Map milestone to valid flash type (use closest available)
          let flashType: 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' = 'combo-5';
          if (milestone >= 50) flashType = 'combo-50';
          else if (milestone >= 30) flashType = 'combo-30';
          else if (milestone >= 20) flashType = 'combo-20';
          else if (milestone >= 10) flashType = 'combo-10';
          else flashType = 'combo-5';
          
          setScreenFlash(flashType);
          // Longer duration for higher milestones
          const flashDuration = milestone >= 75 ? 500 : milestone >= 50 ? 400 : milestone >= 30 ? 350 : milestone >= 20 ? 300 : milestone >= 10 ? 250 : 200;
          flashTimer = setTimer(() => {
            setScreenFlash(null);
          }, reducedEffects ? flashDuration * 0.5 : flashDuration);
        }
        
        // Clear milestone after animation duration
        const milestoneTimer = setTimer(() => {
          setComboMilestone(null);
        }, 1000);
        
        // Cleanup both timers
        return () => {
          clearTimer(milestoneTimer);
          if (flashTimer) {
            clearTimer(flashTimer);
          }
        };
      }
    }
    
    // Reset milestone tracking when combo resets to 0
    if (combo === 0) {
      lastMilestoneRef.current = 0;
    }
  }, [combo, screenFlashEnabled, reducedEffects, soundEnabled, setScreenFlash, setTimer, clearTimer]);

  // Update previous combo value
  useEffect(() => {
    previousComboRef.current = combo;
  }, [combo]);

  return { comboMilestone };
}

