'use client';

import { useCallback } from 'react';
import { startTransition } from 'react';
import { GameMode } from '@/lib/gameModes';
import { playSound } from '@/lib/soundUtils';

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
  incrementScore: (reactionTime: number) => void;
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
  incrementScore,
  decrementLives,
  clearHighlightTimer,
  highlightNewButtons,
  setTimer,
}: UseGameButtonHandlersOptions) {
  // Handle button press (Reflex / Survival / Nightmare modes)
  const handleReflexButtonPress = useCallback(
    (buttonId: number) => {
      if (gameOver || isPausedRef.current || !isReady || !highlightedButtons.length || isProcessingRef.current) {
        return;
      }

      const isBonusHit = bonusActive && bonusButtonId === buttonId;

      if (highlightedButtons.includes(buttonId)) {
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

        // Increment score, with a small bonus multiplier when a fast-streak objective is active
        if (fastStreakActive) {
          incrementScore(Math.max(1, Math.floor(reactionTime * 0.8)));
        } else {
          incrementScore(reactionTime);
        }
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

        // Remove this button from highlighted buttons
        const updatedHighlighted = highlightedButtons.filter(
          (id) => id !== buttonId
        );
        setHighlightedButtons(updatedHighlighted);
        currentHighlightedRef.current = updatedHighlighted;

        // If all highlighted buttons are pressed, reset highlight time
        if (updatedHighlighted.length === 0) {
          highlightStartTimeRef.current = null;
          setHighlightStartTimeState(null);
          setHighlightDuration(0);
          clearHighlightTimer();
          nextHighlightTimerRef.current = setTimer(() => {
            highlightNewButtons();
          }, 500);
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
        
        // Calculate new lives before calling decrementLives (which updates state async)
        const livesAfterDecrement = lives - 1;
        decrementLives();
        
        // Schedule next highlight if player will still have lives after this decrement
        if (livesAfterDecrement > 0) {
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

        // Clear this round and schedule next cluster
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        setHighlightStartTimeState(null);
        setHighlightDuration(0);
        clearHighlightTimer();
        setOddOneOutTarget(null);

        nextHighlightTimerRef.current = setTimer(() => {
          highlightNewButtons();
        }, 700);
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

        if (livesAfterDecrement > 0) {
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

