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
  setSequenceDistractorButtons: (buttons: number[]) => void;
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
  setSequenceDistractorButtons,
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
  // Optional secondary track for multi-track sequences (shown with different color)
  const [distractorSequence, setDistractorSequence] = useState<number[]>([]);
  const [useMultiTrack, setUseMultiTrack] = useState(false);

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

    // Enable multi-track sequences (interleaved "second track") at higher performance.
    // Players still need to replay only the primary sequence; the second track adds visual noise.
    const shouldUseMultiTrack =
      sequenceLength >= 4 && // Avoid complexity on very short sequences
      score >= 150 &&         // Only after some progress
      Math.random() < 0.6;   // Not every round, to keep it special

    setUseMultiTrack(shouldUseMultiTrack);
    if (shouldUseMultiTrack) {
      // Generate a second, independent track of equal length
      const newDistractor = generateSequence(sequenceLength);
      setDistractorSequence(newDistractor);
    } else {
      setDistractorSequence([]);
    }
    
    const { displayDuration, gapDuration } = getSequenceTiming(difficulty);
    
    // Show sequence one button at a time (optionally with a simultaneous second "track")
    const showNextButton = (index: number) => {
      if (index >= newSequence.length) {
        // Sequence complete, wait for player input
        setIsShowingSequence(false);
        setIsWaitingForInput(true);
        setHighlightedButtons([]);
        setSequenceDistractorButtons([]);
        isProcessingRef.current = false;
        playSound('highlight', soundEnabled);
        return;
      }
      
      // Highlight current step: primary sequence + optional distractor simultaneously
      setHighlightedButtons([newSequence[index]]);
      if (useMultiTrack && distractorSequence.length === newSequence.length) {
        setSequenceDistractorButtons([distractorSequence[index]]);
      } else {
        setSequenceDistractorButtons([]);
      }
      playSound('highlight', soundEnabled);

      // Schedule next step or completion
      sequenceTimerRef.current = setTimer(() => {
        // Check if game is still active before processing
        if (gameOver || isPausedRef.current || !isReady) {
          return;
        }
        
        setHighlightedButtons([]);
        setSequenceDistractorButtons([]);

        if (index < newSequence.length - 1) {
          // Gap before next button
          setTimer(() => {
            // Check again before showing next button
            if (!gameOver && !isPausedRef.current && isReady) {
              showNextButton(index + 1);
            }
          }, gapDuration);
        } else {
          // Sequence complete
          setTimer(() => {
            // Check again before completing sequence
            if (!gameOver && !isPausedRef.current && isReady) {
              setIsShowingSequence(false);
              setIsWaitingForInput(true);
              setHighlightedButtons([]);
              setSequenceDistractorButtons([]);
              isProcessingRef.current = false;
            }
          }, gapDuration);
        }
      }, displayDuration);
    };
    
    // Start showing sequence after a reduced delay
    setTimer(() => {
      showNextButton(0);
    }, 200);
  }, [score, difficulty, gameOver, isReady, soundEnabled, clearHighlightTimer, setTimer, isPausedRef, isProcessingRef, setHighlightedButtons, sequenceTimerRef, useMultiTrack, distractorSequence.length]);
  
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

          // Sequence mode doesn't use per-button reaction time, but the scoring
          // system expects a positive value to award points. Use a synthetic
          // "baseline" reaction time so completing a sequence still grants score.
          incrementScore(300);
          
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
          // Wrong sequence - end current sequence immediately
          // Disable input immediately to prevent further button presses
          setIsWaitingForInput(false);
          isProcessingRef.current = true;
          
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
          
          // Start new sequence after error
          if (!gameOver) {
            setTimer(() => {
              isProcessingRef.current = false; // Reset processing flag so showSequence can run
              showSequence();
            }, 1500);
          }
        }
      } else {
        // Check if current input is correct so far
        if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
          // Wrong button pressed - end current sequence immediately
          // Disable input immediately to prevent further button presses
          setIsWaitingForInput(false);
          isProcessingRef.current = true;
          
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
          
          // Start new sequence after error
          if (!gameOver) {
            setTimer(() => {
              isProcessingRef.current = false; // Reset processing flag so showSequence can run
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
    setDistractorSequence([]);
    setUseMultiTrack(false);
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

