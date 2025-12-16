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
    if (gameOver || isProcessingRef.current || !isReady || isPausedRef.current) return;

    clearHighlightTimer();
    isProcessingRef.current = true;

    // Capture multiplier at the time buttons are highlighted to prevent mid-highlight changes
    const currentMultiplier = adaptiveMultiplierRef.current;
    let newHighlighted: number[] = [];

    if (gameMode === 'oddOneOut') {
      // Odd One Out mode: use the same pattern system for the layout, then pick a single correct target
      const baseCount = getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier);
      // Clamp to 3–6 buttons for better visual discrimination
      const buttonCount = Math.min(6, Math.max(3, baseCount));

      const usePatterns = score > 50 || Math.random() < 0.6;

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
      const buttonCount = getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier);
      
      // Use patterns for all non-oddOneOut, non-sequence modes that rely on this hook
      // (60% chance, or always at higher scores)
      const usePatterns =
        (gameMode === 'reflex' ||
          gameMode === 'survival' ||
          gameMode === 'nightmare') &&
        (score > 50 || Math.random() < 0.6);
      
      if (usePatterns) {
        // Generate pattern-based highlights
        // For patterns, ignore target button count - let the pattern use its natural button count
        const pattern = generatePattern(buttonCount, score, lastHighlightedRef.current);
        newHighlighted = pattern.buttons;
        patternRef.current = pattern;
        
        // Don't add bonus buttons when using patterns - patterns need to be preserved exactly
        setBonusButtonId(null);
        setBonusActive(false);
      } else {
        // Fallback to random selection
        newHighlighted = getRandomButtons(
          buttonCount,
          10,
          lastHighlightedRef.current
        );
        patternRef.current = null;
        
        // Occasionally spawn a bonus button in reflex / survival / nightmare (only for random, not patterns)
        let bonusWasAdded = false;
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
            bonusWasAdded = true;
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

    // Assign multi-hit requirements (30% chance per button, 2–3 hits) for all modes
    // that use this hook, except for sequence (which has its own sequence logic).
    if (gameMode !== 'sequence' && gameMode !== 'oddOneOut') {
      const hitRequirements: Record<number, number> = {};
      newHighlighted.forEach((buttonId) => {
        if (Math.random() < 0.3) {
          hitRequirements[buttonId] = Math.random() < 0.5 ? 2 : 3;
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
    const duration = getHighlightDurationForDifficulty(score, difficulty, currentMultiplier);
    setHighlightDuration(duration);
    
    // Determine if bonus was added - track it locally since state updates are async
    const expectedCount = gameMode === 'oddOneOut' 
      ? Math.min(6, Math.max(3, getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier)))
      : getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier);
    const hasBonus = newHighlighted.length > expectedCount;
    
    setBonusHighlightDuration(hasBonus ? Math.max(200, duration * 0.6) : null);

    timerRef.current = setTimer(() => {
      // Check if game is still active before processing timer callback
      if (gameOver || isPausedRef.current || !isReady) {
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
        
        // Only schedule next highlight if game is still active
        if (!gameOver) {
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
    gameMode,
    score,
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

