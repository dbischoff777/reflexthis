'use client';

import { useCallback } from 'react';
import { startTransition } from 'react';
import { GameMode } from '@/lib/gameModes';
import { playSound } from '@/lib/soundUtils';
import type { Pattern } from '@/lib/patternGenerator';

interface UseGameButtonHandlersOptions {
  gameOver: boolean;
  isReady: boolean;
  isPausedRef: React.MutableRefObject<boolean>;
  isProcessingRef: React.MutableRefObject<boolean>;
  gameMode: GameMode;
  highlightedButtons: number[];
  oddOneOutTarget: number | null;
  bonusActive: boolean;
  bonusButtonId: number | null;
  fastStreakActive: boolean;
  maxLives: number;
  lives: number;
  reactionTimeStats: { fastest: number | null };
  screenShakeEnabled: boolean;
  screenFlashEnabled: boolean;
  reducedEffects: boolean;
  soundEnabled: boolean;
  highlightStartTimeRef: React.MutableRefObject<number | null>;
  currentHighlightedRef: React.MutableRefObject<number[]>;
  nextHighlightTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  latencyMonitorRef?: React.MutableRefObject<{ recordFeedback: (buttonId: number) => void } | undefined>;
  currentPatternRef?: React.MutableRefObject<Pattern | null>;
  buttonHitRequirements: Record<number, number>;
  buttonHitCounts: Record<number, number>;
  setButtonPressFeedback: React.Dispatch<React.SetStateAction<Record<number, 'correct' | 'incorrect' | null>>>;
  setButtonReactionTimes: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
  setCurrentReactionTime: (time: number | null) => void;
  setIsNewBestReaction: (isBest: boolean) => void;
  setHighlightedButtons: (buttons: number[]) => void;
  setHighlightStartTimeState: (time: number | null) => void;
  setHighlightDuration: (duration: number) => void;
  setOddOneOutTarget: (target: number | null) => void;
  setBonusActive: (active: boolean) => void;
  setBonusButtonId: (id: number | null) => void;
  setBonusHighlightDuration: (duration: number | null) => void;
  setScreenShake: (shake: boolean) => void;
  setScreenFlash: (flash: 'error' | 'success' | 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' | null) => void;
  setFastStreakCount: React.Dispatch<React.SetStateAction<number>>;
  setFastStreakActive: (active: boolean) => void;
  setLives: (lives: number) => void;
  setButtonHitCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  incrementScore: (reactionTime: number, patternBonusMultiplier?: number) => void;
  decrementLives: () => void;
  clearHighlightTimer: () => void;
  highlightNewButtons: () => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
}

export function useGameButtonHandlers({
  gameOver,
  isReady,
  isPausedRef,
  isProcessingRef,
  gameMode,
  highlightedButtons,
  oddOneOutTarget,
  bonusActive,
  bonusButtonId,
  fastStreakActive,
  maxLives,
  lives,
  reactionTimeStats,
  screenShakeEnabled,
  screenFlashEnabled,
  reducedEffects,
  soundEnabled,
  highlightStartTimeRef,
  currentHighlightedRef,
  nextHighlightTimerRef,
  latencyMonitorRef,
  currentPatternRef,
  buttonHitRequirements,
  buttonHitCounts,
  setButtonPressFeedback,
  setButtonReactionTimes,
  setCurrentReactionTime,
  setIsNewBestReaction,
  setHighlightedButtons,
  setHighlightStartTimeState,
  setHighlightDuration,
  setOddOneOutTarget,
  setBonusActive,
  setBonusButtonId,
  setBonusHighlightDuration,
  setScreenShake,
  setScreenFlash,
  setFastStreakCount,
  setFastStreakActive,
  setLives,
  setButtonHitCounts,
  incrementScore,
  decrementLives,
  clearHighlightTimer,
  highlightNewButtons,
  setTimer,
}: UseGameButtonHandlersOptions) {
  // Handle button press (Reflex / Survival / Nightmare modes)
  const handleReflexButtonPress = useCallback(
    (buttonId: number) => {
      // Check both state and ref for highlighted buttons to handle race conditions in fast modes like nightmare
      // The ref is updated synchronously and won't have stale state issues
      const hasHighlightedButtons = highlightedButtons.length > 0 || currentHighlightedRef.current.length > 0;
      
      if (gameOver || isPausedRef.current || !isReady || !hasHighlightedButtons || isProcessingRef.current) {
        return;
      }

      const isBonusHit = bonusActive && bonusButtonId === buttonId;

      // Check both state and ref to handle cases where state hasn't updated yet or has been cleared
      const isHighlighted = highlightedButtons.includes(buttonId) || currentHighlightedRef.current.includes(buttonId);

      if (isHighlighted) {
        // Calculate reaction time
        const reactionTime = highlightStartTimeRef.current
          ? Date.now() - highlightStartTimeRef.current
          : 0;

        // Check if this is a new best reaction time
        const wasNewBest = reactionTimeStats.fastest === null || reactionTime < reactionTimeStats.fastest;
        setIsNewBestReaction(wasNewBest);
        setCurrentReactionTime(reactionTime);

        // Correct button pressed - show feedback and particles
        // Use requestAnimationFrame for immediate visual feedback to minimize latency
        requestAnimationFrame(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
          setButtonReactionTimes((prev) => ({ ...prev, [buttonId]: reactionTime }));
          
          // Record visual feedback timestamp for latency monitoring
          if (latencyMonitorRef?.current) {
            latencyMonitorRef.current.recordFeedback(buttonId);
          }
        });
        setTimer(() => {
          startTransition(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
            setButtonReactionTimes((prev) => ({ ...prev, [buttonId]: null }));
          });
        }, 300);

        // Get pattern bonus multiplier if pattern is active
        // Pattern bonus applies to each button press in the pattern
        const patternBonus = currentPatternRef?.current?.bonusMultiplier || 1.0;
        
        // Increment score, with pattern bonus and fast-streak bonus
        // Note: reactionTime is used for scoring calculation, not directly as points
        if (fastStreakActive) {
          incrementScore(Math.max(1, Math.floor(reactionTime * 0.8)), patternBonus);
        } else {
          incrementScore(reactionTime, patternBonus);
        }
        
        // Clear pattern when all buttons in pattern are pressed
        // (updatedHighlighted.length === 0 means all buttons were pressed)
        // Pattern will also be cleared if buttons expire (handled in useHighlightButtons)
        // Success flash (respect comfort settings)
        if (screenFlashEnabled) {
          setScreenFlash('success');
          setTimer(
            () => setScreenFlash(null),
            reducedEffects ? 120 : 200
          );
        }
        
        // Reset reaction time after a short delay to allow feedback to process
        setTimer(() => {
          setCurrentReactionTime(null);
          setIsNewBestReaction(false);
        }, 100);

        // Micro-objective: track fast streaks (e.g. < 250ms) only in reflex/survival/nightmare
        if (
          (gameMode === 'reflex' || gameMode === 'survival' || gameMode === 'nightmare') &&
          reactionTime > 0 &&
          reactionTime <= 250
        ) {
          setFastStreakCount((prev) => {
            const next = prev + 1;
            if (!fastStreakActive && next >= 5) {
              setFastStreakActive(true);
              // Temporary objective buff ends automatically after a short delay
              setTimer(() => setFastStreakActive(false), 8000);
            }
            return next;
          });
        } else {
          setFastStreakCount(0);
        }

        // Bonus button: heal (except survival) and extra score
        if (isBonusHit) {
          setBonusActive(false);
          setBonusButtonId(null);
          setBonusHighlightDuration(null);
          // Heal 1 life up to maxLives (skip in survival mode - only 1 life)
          if (gameMode !== 'survival') {
            setLives(Math.min(maxLives, lives + 1));
          }
          // Extra celebratory flash
          if (screenFlashEnabled) {
            setScreenFlash('combo-5');
            setTimer(
              () => setScreenFlash(null),
              reducedEffects ? 150 : 260
            );
          }
        }

        // Check if this button requires multiple hits
        const requiredHits = buttonHitRequirements[buttonId] || 1;
        const currentHits = buttonHitCounts[buttonId] || 0;
        const newHitCount = currentHits + 1;

        // Update hit count
        setButtonHitCounts((prev) => ({ ...prev, [buttonId]: newHitCount }));

        // Only remove button if all required hits are completed
        if (newHitCount >= requiredHits) {
          // Remove this button from highlighted buttons
          // Use ref as source of truth to handle race conditions in fast modes
          const sourceButtons = currentHighlightedRef.current.length > 0 
            ? currentHighlightedRef.current 
            : highlightedButtons;
          const updatedHighlighted = sourceButtons.filter(
            (id) => id !== buttonId
          );
          setHighlightedButtons(updatedHighlighted);
          currentHighlightedRef.current = updatedHighlighted;

          // Clear hit tracking for this button
          setButtonHitCounts((prev) => {
            const next = { ...prev };
            delete next[buttonId];
            return next;
          });

          // If all highlighted buttons are pressed, reset highlight time and clear pattern
          if (updatedHighlighted.length === 0) {
            highlightStartTimeRef.current = null;
            setHighlightStartTimeState(null);
            setHighlightDuration(0);
            clearHighlightTimer();
            // Clear pattern when all buttons are pressed
            if (currentPatternRef?.current) {
              currentPatternRef.current = null;
            }
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
                highlightNewButtons();
              }, 500);
            }
          }
        }
      } else {
        // Wrong button pressed - show feedback, screen shake, and error particles
        // Use requestAnimationFrame for immediate visual feedback
        requestAnimationFrame(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
          
          // Record visual feedback timestamp for latency monitoring
          if (latencyMonitorRef?.current) {
            latencyMonitorRef.current.recordFeedback(buttonId);
          }
        });
        setTimer(() => {
          startTransition(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
          });
        }, 300);

        // Trigger screen shake (respect comfort settings)
        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimer(() => {
            setScreenShake(false);
          }, 400);
        }

        playSound('error', soundEnabled);
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimer(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }
        
        // Clear highlighted buttons (match behavior when timer expires)
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setHighlightDuration(0);
        clearHighlightTimer();
        
        // Let GameContext handle whether the player actually loses a life,
        // including survival-mode shields and revives. Only schedule the next
        // highlight if the game is still active and mode hasn't changed.
        // Note: Defensive check for mode changes - timer could fire after mode switch
        decrementLives();
        const currentMode = gameMode as GameMode;
        if (!gameOver && currentMode !== 'sequence') {
          // Clear any existing next highlight timer to prevent overlapping timers
          if (nextHighlightTimerRef.current) {
            clearTimeout(nextHighlightTimerRef.current);
            nextHighlightTimerRef.current = null;
          }
          nextHighlightTimerRef.current = setTimer(() => {
            highlightNewButtons();
          }, 1000);
        }
      }
    },
    [
      gameOver,
      isReady,
      isPausedRef,
      isProcessingRef,
      highlightedButtons,
      bonusActive,
      bonusButtonId,
      fastStreakActive,
      gameMode,
      maxLives,
      reactionTimeStats,
      screenShakeEnabled,
      screenFlashEnabled,
      reducedEffects,
      soundEnabled,
      highlightStartTimeRef,
      currentHighlightedRef,
      nextHighlightTimerRef,
      latencyMonitorRef,
      setButtonPressFeedback,
      setButtonReactionTimes,
      setCurrentReactionTime,
      setIsNewBestReaction,
      setHighlightedButtons,
      setHighlightStartTimeState,
      setHighlightDuration,
      setBonusActive,
      setBonusButtonId,
      setBonusHighlightDuration,
      setScreenShake,
      setScreenFlash,
      setFastStreakCount,
      setFastStreakActive,
      setLives,
      incrementScore,
      decrementLives,
      clearHighlightTimer,
      highlightNewButtons,
      setTimer,
    ]
  );

  // Handle button press (Odd One Out mode)
  const handleOddOneOutButtonPress = useCallback(
    (buttonId: number) => {
      if (gameMode !== 'oddOneOut') return;
      if (gameOver || isPausedRef.current || !isReady || !highlightedButtons.length || isProcessingRef.current) {
        return;
      }

      const isHighlighted = highlightedButtons.includes(buttonId);
      const isCorrect = isHighlighted && oddOneOutTarget !== null && buttonId === oddOneOutTarget;

      if (isCorrect) {
        // Calculate reaction time from when this cluster appeared
        const reactionTime = highlightStartTimeRef.current
          ? Date.now() - highlightStartTimeRef.current
          : 0;

        const wasNewBest =
          reactionTimeStats.fastest === null || reactionTime < reactionTimeStats.fastest;
        setIsNewBestReaction(wasNewBest);
        setCurrentReactionTime(reactionTime);

        // Correct target pressed
        startTransition(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
          setButtonReactionTimes((prev) => ({ ...prev, [buttonId]: reactionTime }));
        });
        setTimer(() => {
          startTransition(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
            setButtonReactionTimes((prev) => ({ ...prev, [buttonId]: null }));
          });
        }, 300);

        incrementScore(reactionTime);

        if (screenFlashEnabled) {
          setScreenFlash('success');
          setTimer(() => setScreenFlash(null), reducedEffects ? 120 : 200);
        }

        setTimer(() => {
          setCurrentReactionTime(null);
          setIsNewBestReaction(false);
        }, 100);

        // Clear this round and schedule next cluster (no multi-hit in odd-one-out)
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setHighlightDuration(0);
        clearHighlightTimer();
        setOddOneOutTarget(null);

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
            highlightNewButtons();
          }, 700);
        }
      } else {
        // Any wrong press (non-highlighted or non-target highlight) is a mistake
        requestAnimationFrame(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
          
          // Record visual feedback timestamp for latency monitoring
          if (latencyMonitorRef?.current) {
            latencyMonitorRef.current.recordFeedback(buttonId);
          }
        });
        setTimer(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
        }, 300);

        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimer(() => {
            setScreenShake(false);
          }, 400);
        }

        playSound('error', soundEnabled);
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimer(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }

        // Clear current cluster and penalize
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setHighlightDuration(0);
        clearHighlightTimer();
        setOddOneOutTarget(null);

        const livesAfterDecrement = lives - 1;
        decrementLives();

        // Only schedule next highlight if game is still active, mode hasn't changed, and player has lives
        // Note: Defensive check for mode changes - timer could fire after mode switch
        const currentMode = gameMode as GameMode;
        if (!gameOver && livesAfterDecrement > 0 && currentMode !== 'sequence') {
          // Clear any existing next highlight timer to prevent overlapping timers
          if (nextHighlightTimerRef.current) {
            clearTimeout(nextHighlightTimerRef.current);
            nextHighlightTimerRef.current = null;
          }
          nextHighlightTimerRef.current = setTimer(() => {
            highlightNewButtons();
          }, 1000);
        }
      }
    },
    [
      gameMode,
      gameOver,
      isReady,
      isPausedRef,
      isProcessingRef,
      highlightedButtons,
      oddOneOutTarget,
      reactionTimeStats,
      screenShakeEnabled,
      screenFlashEnabled,
      reducedEffects,
      soundEnabled,
      highlightStartTimeRef,
      currentHighlightedRef,
      nextHighlightTimerRef,
      latencyMonitorRef,
      setButtonPressFeedback,
      setButtonReactionTimes,
      setCurrentReactionTime,
      setIsNewBestReaction,
      setHighlightedButtons,
      setHighlightStartTimeState,
      setHighlightDuration,
      setOddOneOutTarget,
      setScreenShake,
      setScreenFlash,
      incrementScore,
      decrementLives,
      clearHighlightTimer,
      highlightNewButtons,
      setTimer,
      lives,
    ]
  );

  return {
    handleReflexButtonPress,
    handleOddOneOutButtonPress,
  };
}

