'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  generateSequence,
  getSequenceLength,
  getSequenceTiming,
  checkSequence,
} from '@/lib/sequenceUtils';
import { DifficultyPreset } from '@/lib/difficulty';
import { playSound } from '@/lib/soundUtils';

interface UseSequenceModeOptions {
  gameOver: boolean;
  isReady: boolean;
  isPausedRef: React.MutableRefObject<boolean>;
  isProcessingRef: React.MutableRefObject<boolean>;
  score: number;
  difficulty: DifficultyPreset;
  combo: number;
  screenShakeEnabled: boolean;
  screenFlashEnabled: boolean;
  reducedEffects: boolean;
  soundEnabled: boolean;
  highlightedButtons: number[];
  latencyMonitorRef?: React.MutableRefObject<{ recordFeedback: (buttonId: number) => void } | undefined>;
  setHighlightedButtons: (buttons: number[]) => void;
  setButtonPressFeedback: React.Dispatch<React.SetStateAction<Record<number, 'correct' | 'incorrect' | null>>>;
  setScreenShake: (shake: boolean) => void;
  setScreenFlash: (flash: 'error' | 'success' | 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' | null) => void;
  incrementScore: (reactionTime: number) => void;
  decrementLives: () => void;
  clearHighlightTimer: () => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
  previousComboRef: React.MutableRefObject<number>;
  previousScoreRef: React.MutableRefObject<number>;
  sequenceTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export function useSequenceMode({
  gameOver,
  isReady,
  isPausedRef,
  isProcessingRef,
  score,
  difficulty,
  combo,
  screenShakeEnabled,
  screenFlashEnabled,
  reducedEffects,
  soundEnabled,
  highlightedButtons,
  latencyMonitorRef,
  setHighlightedButtons,
  setButtonPressFeedback,
  setScreenShake,
  setScreenFlash,
  incrementScore,
  decrementLives,
  clearHighlightTimer,
  setTimer,
  previousComboRef,
  previousScoreRef,
  sequenceTimerRef,
}: UseSequenceModeOptions) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);

  // Show sequence to player
  const showSequence = useCallback(() => {
    if (gameOver || !isReady || isPausedRef.current || isProcessingRef.current) return;
    
    clearHighlightTimer();
    isProcessingRef.current = true;
    setIsWaitingForInput(false);
    setIsShowingSequence(true);
    setPlayerSequence([]);
    
    const sequenceLength = getSequenceLength(score, difficulty);
    const newSequence = generateSequence(sequenceLength);
    setSequence(newSequence);
    
    const { displayDuration, gapDuration } = getSequenceTiming(difficulty);
    
    // Show sequence one button at a time
    const showNextButton = (index: number) => {
      if (index >= newSequence.length) {
        // Sequence complete, wait for player input
        setIsShowingSequence(false);
        setIsWaitingForInput(true);
        setHighlightedButtons([]);
        isProcessingRef.current = false;
        playSound('highlight', soundEnabled);
        return;
      }
      
      // Highlight current button in sequence
      setHighlightedButtons([newSequence[index]]);
      playSound('highlight', soundEnabled);
      
      // Schedule next button or completion
      sequenceTimerRef.current = setTimer(() => {
        setHighlightedButtons([]);
        
        if (index < newSequence.length - 1) {
          // Gap before next button
          setTimer(() => {
            showNextButton(index + 1);
          }, gapDuration);
        } else {
          // Sequence complete
          setTimer(() => {
            setIsShowingSequence(false);
            setIsWaitingForInput(true);
            setHighlightedButtons([]);
            isProcessingRef.current = false;
          }, gapDuration);
        }
      }, displayDuration);
    };
    
    // Start showing sequence after a reduced delay
    setTimer(() => {
      showNextButton(0);
    }, 200);
  }, [score, difficulty, gameOver, isReady, soundEnabled, clearHighlightTimer, setTimer, isPausedRef, isProcessingRef, setHighlightedButtons, sequenceTimerRef]);
  
  // Handle button press in sequence mode
  const handleSequenceButtonPress = useCallback(
    (buttonId: number) => {
      // Only allow input after sequence is complete (isWaitingForInput is true)
      if (gameOver || isPausedRef.current || !isReady || !isWaitingForInput || isShowingSequence || isProcessingRef.current) {
        return;
      }
      
      const newPlayerSequence = [...playerSequence, buttonId];
      setPlayerSequence(newPlayerSequence);
      
      // Check if sequence is complete
      if (newPlayerSequence.length === sequence.length) {
        // Check if correct
        if (checkSequence(newPlayerSequence, sequence)) {
          // Correct sequence - show feedback for all buttons
          sequence.forEach((id) => {
            setButtonPressFeedback((prev) => ({ ...prev, [id]: 'correct' }));
            setTimer(() => {
              setButtonPressFeedback((prev) => ({ ...prev, [id]: null }));
            }, 300);
          });

          incrementScore(0); // No reaction time in sequence mode
          
          // Update previous values for feedback tracking
          previousComboRef.current = combo;
          previousScoreRef.current = score;
          
          if (screenFlashEnabled) {
            setScreenFlash('success');
            setTimer(() => setScreenFlash(null), reducedEffects ? 120 : 200);
          }
          
          // Generate next sequence
          setTimer(() => {
            showSequence();
          }, 1000);
        } else {
          // Wrong sequence - show feedback for wrong button
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
          setPlayerSequence([]);
          decrementLives();
          
          // Restart sequence after error
          if (!gameOver) {
            setTimer(() => {
              showSequence();
            }, 1500);
          }
        }
      } else {
        // Check if current input is correct so far
        if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
          // Wrong button pressed - show feedback
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
            setTimer(
              () => setScreenFlash(null),
              reducedEffects ? 150 : 300
            );
          }
          setPlayerSequence([]);
          decrementLives();
          
          // Restart sequence after error
          if (!gameOver) {
            setTimer(() => {
              showSequence();
            }, 1500);
          }
        } else {
          // Correct so far - show feedback
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
          setTimer(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
          }, 300);
          
          playSound('success', soundEnabled);
        }
      }
    },
    [
      gameOver,
      isReady,
      isPausedRef,
      isProcessingRef,
      isWaitingForInput,
      isShowingSequence,
      playerSequence,
      sequence,
      screenShakeEnabled,
      screenFlashEnabled,
      reducedEffects,
      soundEnabled,
      latencyMonitorRef,
      setButtonPressFeedback,
      setScreenShake,
      setScreenFlash,
      incrementScore,
      decrementLives,
      showSequence,
      setTimer,
      previousComboRef,
      previousScoreRef,
      combo,
      score,
      latencyMonitorRef,
    ]
  );

  const resetSequence = useCallback(() => {
    setSequence([]);
    setPlayerSequence([]);
    setIsShowingSequence(false);
    setIsWaitingForInput(false);
  }, []);

  return {
    sequence,
    playerSequence,
    isShowingSequence,
    isWaitingForInput,
    showSequence,
    handleSequenceButtonPress,
    resetSequence,
  };
}

