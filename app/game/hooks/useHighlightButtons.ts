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
  decrementLives: () => void;
  clearHighlightTimer: () => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  nextHighlightTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastHighlightedRef: React.MutableRefObject<number[]>;
  currentHighlightedRef: React.MutableRefObject<number[]>;
  highlightStartTimeRef: React.MutableRefObject<number | null>;
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
  decrementLives,
  clearHighlightTimer,
  setTimer,
  timerRef,
  nextHighlightTimerRef,
  lastHighlightedRef,
  currentHighlightedRef,
  highlightStartTimeRef,
}: UseHighlightButtonsOptions) {
  const { adaptiveDifficultyMultiplier } = useGameState();
  const adaptiveMultiplierRef = useRef(adaptiveDifficultyMultiplier);
  
  // Keep ref in sync with state
  useEffect(() => {
    adaptiveMultiplierRef.current = adaptiveDifficultyMultiplier;
  }, [adaptiveDifficultyMultiplier]);
  
  const highlightNewButtons = useCallback(function highlightNewButtonsInternal() {
    if (gameOver || isProcessingRef.current || !isReady || isPausedRef.current) return;

    clearHighlightTimer();
    isProcessingRef.current = true;

    // Capture multiplier at the time buttons are highlighted to prevent mid-highlight changes
    const currentMultiplier = adaptiveMultiplierRef.current;
    let newHighlighted: number[] = [];

    if (gameMode === 'oddOneOut') {
      // Odd One Out mode: always show a small cluster of buttons and pick a single correct target
      const baseCount = getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier);
      // Clamp to 3–6 buttons for better visual discrimination
      const buttonCount = Math.min(6, Math.max(3, baseCount));
      newHighlighted = getRandomButtons(buttonCount, 10);
      if (newHighlighted.length > 0) {
        const targetIndex = Math.floor(Math.random() * newHighlighted.length);
        setOddOneOutTarget(newHighlighted[targetIndex]);
      } else {
        setOddOneOutTarget(null);
      }
    } else {
      const buttonCount = getButtonsToHighlightForDifficulty(score, difficulty, currentMultiplier);
      newHighlighted = getRandomButtons(
        buttonCount,
        10,
        lastHighlightedRef.current
      );
      setOddOneOutTarget(null);

      // Occasionally spawn a bonus button in reflex / survival / nightmare
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

    lastHighlightedRef.current = newHighlighted;

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
      // Check if buttons are still highlighted (not pressed)
      if (currentHighlightedRef.current.length > 0) {
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setOddOneOutTarget(null);
        
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
        // Calculate new lives before calling decrementLives (which updates state async)
        const livesAfterDecrement = lives - 1;
        decrementLives();
      
        // Schedule next highlight if player will still have lives after this decrement
        if (livesAfterDecrement > 0) {
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

  return { highlightNewButtons };
}

