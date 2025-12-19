'use client';

import { useRef, useCallback, useEffect } from 'react';
import { GameMode } from '@/lib/gameModes';
import { DifficultyPreset } from '@/lib/difficulty';
import { getRandomButtons } from '@/lib/gameUtils';
import {
  getButtonsToHighlightForDifficulty,
  getHighlightDurationForDifficulty,
} from '@/lib/difficulty';
import { playSound } from '@/lib/soundUtils';
import { useGameState } from '@/lib/GameContext';
import { generatePattern, Pattern, PatternType } from '@/lib/patternGenerator';

interface UseHighlightButtonsOptions {
  gameOver: boolean;
  isReady: boolean;
  isPausedRef: React.MutableRefObject<boolean>;
  isProcessingRef: React.MutableRefObject<boolean>;
  gameMode: GameMode;
  score: number;
  combo: number;
  difficulty: DifficultyPreset;
  lives: number;
  soundEnabled: boolean;
  screenShakeEnabled: boolean;
  screenFlashEnabled: boolean;
  reducedEffects: boolean;
  setHighlightedButtons: (buttons: number[]) => void;
  setOddOneOutTarget: (target: number | null) => void;
  setBonusButtonId: (id: number | null) => void;
  setBonusActive: (active: boolean) => void;
  setHighlightDuration: (duration: number) => void;
  setBonusHighlightDuration: (duration: number | null) => void;
  setHighlightStartTimeState: (time: number | null) => void;
  setScreenShake: (shake: boolean) => void;
  setScreenFlash: (flash: 'error' | 'success' | 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' | null) => void;
  setButtonHitRequirements: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  decrementLives: () => void;
  clearHighlightTimer: () => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  nextHighlightTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastHighlightedRef: React.MutableRefObject<number[]>;
  currentHighlightedRef: React.MutableRefObject<number[]>;
  highlightStartTimeRef: React.MutableRefObject<number | null>;
  currentPatternRef?: React.MutableRefObject<Pattern | null>;
}

export function useHighlightButtons({
  gameOver,
  isReady,
  isPausedRef,
  isProcessingRef,
  gameMode,
  score,
  combo,
  difficulty,
  lives,
  soundEnabled,
  screenShakeEnabled,
  screenFlashEnabled,
  reducedEffects,
  setHighlightedButtons,
  setOddOneOutTarget,
  setBonusButtonId,
  setBonusActive,
  setHighlightDuration,
  setBonusHighlightDuration,
  setHighlightStartTimeState,
  setScreenShake,
  setScreenFlash,
  setButtonHitRequirements,
  decrementLives,
  clearHighlightTimer,
  setTimer,
  timerRef,
  nextHighlightTimerRef,
  lastHighlightedRef,
  currentHighlightedRef,
  highlightStartTimeRef,
  currentPatternRef,
}: UseHighlightButtonsOptions) {
  const { adaptiveDifficultyMultiplier } = useGameState();
  const adaptiveMultiplierRef = useRef(adaptiveDifficultyMultiplier);
  
  // Keep ref in sync with state
  useEffect(() => {
    adaptiveMultiplierRef.current = adaptiveDifficultyMultiplier;
  }, [adaptiveDifficultyMultiplier]);
  
  // Create pattern ref if not provided
  const internalPatternRef = useRef<Pattern | null>(null);
  const patternRef = currentPatternRef || internalPatternRef;
  
  const highlightNewButtons = useCallback(function highlightNewButtonsInternal() {
    // Early exit if game is over, processing, not ready, paused, or in sequence mode
    // Sequence mode has its own highlight logic and should not use this hook
    // CRITICAL: Never spawn new highlights if there are already active highlights
    if (
      gameOver || 
      isProcessingRef.current || 
      !isReady || 
      isPausedRef.current || 
      gameMode === 'sequence' ||
      currentHighlightedRef.current.length > 0  // Prevent spawning if highlights are already active
    ) return;

    clearHighlightTimer();
    isProcessingRef.current = true;

    // Capture multiplier at the time buttons are highlighted to prevent mid-highlight changes
    const currentMultiplier = adaptiveMultiplierRef.current;
    let newHighlighted: number[] = [];
    // Track if bonus button exists (for duration calculation)
    let hasBonusButton = false;

    // Spawn chance scales with combo: starts at 20% (combo 0) and increases to 60% (combo 100)
    const calculatePatternSpawnChance = (comboValue: number): number => {
      // Base chance at combo 0: 20%
      // Max chance at combo 100: 60%
      // Smooth scaling between them across the full combo range
      const baseChance = 0.2;
      const maxChance = 0.6;
      const maxCombo = 100;
      
      if (comboValue >= maxCombo) {
        return maxChance;
      }
      
      // Linear interpolation between base and max
      const progress = comboValue / maxCombo;
      return baseChance + (maxChance - baseChance) * progress;
    };

    if (gameMode === 'oddOneOut') {
      // Odd One Out mode: use the same pattern system for the layout, then pick a single correct target
      const baseCount = getButtonsToHighlightForDifficulty(combo, difficulty, currentMultiplier);
      // Clamp to 3–6 buttons for better visual discrimination
      const buttonCount = Math.min(6, Math.max(3, baseCount));

      const patternSpawnChance = calculatePatternSpawnChance(combo);
      const usePatterns = Math.random() < patternSpawnChance;

      if (usePatterns) {
        const pattern = generatePattern(buttonCount, score, lastHighlightedRef.current);
        newHighlighted = pattern.buttons;
        patternRef.current = pattern;
      } else {
        newHighlighted = getRandomButtons(buttonCount, 10);
        patternRef.current = null;
      }

      if (newHighlighted.length > 0) {
        const targetIndex = Math.floor(Math.random() * newHighlighted.length);
        const targetId = newHighlighted[targetIndex];
        setOddOneOutTarget(targetId);

        // No multi-hit logic in odd-one-out mode
        setButtonHitRequirements({});
      } else {
        setOddOneOutTarget(null);
        setButtonHitRequirements({});
      }
    } else {
      const buttonCount = getButtonsToHighlightForDifficulty(combo, difficulty, currentMultiplier);
      
      // Use patterns for all non-oddOneOut, non-sequence modes that rely on this hook
      // Spawn chance scales with combo: starts at 40% (combo 0) and increases to 100% (combo 10+)
      const patternSpawnChance = calculatePatternSpawnChance(combo);
      const usePatterns =
        (gameMode === 'reflex' ||
          gameMode === 'survival' ||
          gameMode === 'nightmare') &&
        Math.random() < patternSpawnChance;
      
      if (usePatterns) {
        // Generate pattern-based highlights
        // For patterns, ignore target button count - let the pattern use its natural button count
        // Check if we should include a bonus button within the pattern (for reflex and nightmare modes)
        const shouldIncludeBonus = (gameMode === 'reflex' || gameMode === 'nightmare') && Math.random() < 0.18;
        const pattern = generatePattern(buttonCount, score, lastHighlightedRef.current, shouldIncludeBonus);
        newHighlighted = pattern.buttons;
        patternRef.current = pattern;
        
        // Use the bonus button from the pattern if it exists
        if (pattern.bonusButtonId !== null) {
          setBonusButtonId(pattern.bonusButtonId);
          setBonusActive(true);
          hasBonusButton = true;
        } else {
          setBonusButtonId(null);
          setBonusActive(false);
        }
      } else {
        // Fallback to random selection
        newHighlighted = getRandomButtons(
          buttonCount,
          10,
          lastHighlightedRef.current
        );
        patternRef.current = null;
        
        // Occasionally spawn a bonus button in reflex / survival / nightmare (only for random, not patterns)
        if ((gameMode === 'reflex' || gameMode === 'survival' || gameMode === 'nightmare') && Math.random() < 0.18) {
          const available = Array.from({ length: 10 }, (_, i) => i + 1).filter(
            (id) => !newHighlighted.includes(id)
          );
          if (available.length > 0) {
            const idx = Math.floor(Math.random() * available.length);
            const bonusId = available[idx];
            newHighlighted = [...newHighlighted, bonusId];
            setBonusButtonId(bonusId);
            setBonusActive(true);
            hasBonusButton = true;
          } else {
            setBonusButtonId(null);
            setBonusActive(false);
          }
        } else {
          setBonusButtonId(null);
          setBonusActive(false);
        }
      }
      
      setOddOneOutTarget(null);
    }

    lastHighlightedRef.current = newHighlighted;

      // Assign multi-hit requirements based on difficulty for all modes
      // that use this hook, except for sequence (which has its own sequence logic).
      // Note: gameMode is typed to exclude 'sequence' in this hook, but we check defensively
      // to prevent issues if mode changes between timer setup and execution
      if (gameMode !== 'oddOneOut') {
      const hitRequirements: Record<number, number> = {};
      
      // Define additional hits required per difficulty (1 base hit + additional hits)
      const additionalHitsByDifficulty: Record<DifficultyPreset, number> = {
        easy: 1,      // 1 additional hit = 2 total hits
        medium: 1,    // 1 additional hit = 2 total hits
        hard: 2,       // 2 additional hits = 3 total hits
        nightmare: 3, // 3 additional hits = 4 total hits
      };
      
      const additionalHits = additionalHitsByDifficulty[difficulty];
      const totalHitsRequired = 1 + additionalHits; // Base hit + additional hits
      
      newHighlighted.forEach((buttonId) => {
        if (Math.random() < 0.3) {
          hitRequirements[buttonId] = totalHitsRequired;
        }
      });
      setButtonHitRequirements(hitRequirements);
    }

    setHighlightedButtons(newHighlighted);
    currentHighlightedRef.current = newHighlighted;
    const timestamp = Date.now();
    highlightStartTimeRef.current = timestamp; // Track when buttons were highlighted
    setHighlightStartTimeState(timestamp); // Update state for memo dependency
    isProcessingRef.current = false;

    // Play highlight sound
    playSound('highlight', soundEnabled);

    // Set timer to clear highlight and penalize if not pressed in time
    // Use captured multiplier to prevent changes during highlight
    // Reaction time now scales with combo: at combo 100, duration reaches minDuration
    const duration = getHighlightDurationForDifficulty(combo, difficulty, currentMultiplier);
    setHighlightDuration(duration);
    
    // Set bonus highlight duration if bonus button exists
    setBonusHighlightDuration(hasBonusButton ? Math.max(200, duration * 0.6) : null);

    timerRef.current = setTimer(() => {
      // Check if game is still active and mode hasn't changed before processing timer callback
      // Note: Defensive check for mode changes - timer could fire after mode switch
      const currentMode = gameMode as GameMode;
      if (gameOver || isPausedRef.current || !isReady || currentMode === 'sequence') {
        return;
      }
      
      // Check if buttons are still highlighted (not pressed)
      if (currentHighlightedRef.current.length > 0) {
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setOddOneOutTarget(null);
        patternRef.current = null; // Clear pattern when buttons expire
        setButtonHitRequirements({}); // Clear hit requirements when buttons expire
        
        // Trigger screen shake for missed buttons (respect comfort settings)
        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimer(() => {
            setScreenShake(false);
          }, 400);
        }
        
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimer(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }
        // Let GameContext handle life loss and survival protections.
        // Always schedule the next highlight; if the game is actually over,
        // the highlight callback will see gameOver and exit early.
        decrementLives();
        
        // Only schedule next highlight if game is still active and mode hasn't changed
        // Note: Defensive check for mode changes - timer could fire after mode switch
        const currentMode = gameMode as GameMode;
        if (!gameOver && currentMode !== 'sequence') {
          // Clear any existing next highlight timer to prevent overlapping timers
          if (nextHighlightTimerRef.current) {
            clearTimeout(nextHighlightTimerRef.current);
            nextHighlightTimerRef.current = null;
          }
          nextHighlightTimerRef.current = setTimer(() => {
            highlightNewButtonsInternal();
          }, 1000);
        }
      }
    }, duration);
  }, [
    gameOver,
    isReady,
    isPausedRef,
    isProcessingRef,
    gameMode, // Include gameMode to prevent stale closures and ensure mode changes are detected
    score,
    combo,
    difficulty,
    soundEnabled,
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    setHighlightedButtons,
    setOddOneOutTarget,
    setBonusButtonId,
    setBonusActive,
    setHighlightDuration,
    setBonusHighlightDuration,
    setHighlightStartTimeState,
    setScreenShake,
    setScreenFlash,
    decrementLives,
    clearHighlightTimer,
    setTimer,
    timerRef,
    nextHighlightTimerRef,
    lastHighlightedRef,
    currentHighlightedRef,
    highlightStartTimeRef,
    // Note: adaptiveDifficultyMultiplier intentionally NOT in deps to prevent mid-highlight changes
    // We use a ref to capture the current value when buttons are highlighted
  ]);

  return { 
    highlightNewButtons,
    currentPattern: patternRef,
  };
}

