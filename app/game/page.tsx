'use client';

import { useEffect, useRef, useCallback, useState, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { GameButtonGridWebGL } from '@/components/GameButton3DWebGL';
import { OrientationHandler } from '@/components/OrientationHandler';
import { ScreenFlash } from '@/components/ScreenFlash';
import { getRandomButtons } from '@/lib/gameUtils';
import {
  getButtonsToHighlightForDifficulty,
  getHighlightDurationForDifficulty,
  DifficultyPreset,
} from '@/lib/difficulty';
import { GameMode } from '@/lib/gameModes';
import {
  generateSequence,
  getSequenceLength,
  getSequenceTiming,
  checkSequence,
} from '@/lib/sequenceUtils';
import { playSound, setGamePageActive, stopMenuMusic } from '@/lib/soundUtils';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RetroHudWidgets } from '@/components/RetroHudWidgets';
// DynamicAmbience removed - effects now handled by 3D BackgroundGrid in GameButton3DWebGL
import { PerformanceFeedback } from '@/components/PerformanceFeedback';
import { AchievementNotification } from '@/components/AchievementNotification';
import { ComboDisplay } from '@/components/ComboDisplay';
import { VerticalComboMeter } from '@/components/VerticalComboMeter';
import { getKeybindings, getKeyDisplayName, DEFAULT_KEYBINDINGS } from '@/lib/keybindings';
import { t } from '@/lib/i18n';
import { lazy, Suspense } from 'react';
import { useTimer } from '@/hooks/useTimer';

// Lazy load heavy modal components
const GameOverModal = lazy(() => import('@/components/GameOverModal').then(m => ({ default: m.GameOverModal })));
const SettingsModal = lazy(() => import('@/components/SettingsModal'));

export default function GamePage() {
  const router = useRouter();
  const {
    score,
    lives,
    highlightedButtons,
    gameOver,
    soundEnabled,
    musicEnabled,
    highScore,
    combo,
    bestCombo,
    reactionTimeStats,
    difficulty,
    gameMode,
    isPaused,
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    highContrastMode,
    pauseGame,
    resumeGame,
    toggleSound,
    toggleMusic,
    resetGame,
    startGame,
    endGame,
    setHighlightedButtons,
    setLives,
    incrementScore,
    decrementLives,
    setDifficulty,
    setGameMode,
    newlyUnlockedAchievements,
    language,
    lastScoreBreakdown,
  } = useGameState();
  
  const maxLives = gameMode === 'survival' ? 1 : 5;
  // Clamp to avoid negative display values
  const effectiveLives = Math.max(0, Math.min(lives, maxLives));

  const { setTimer, clearTimer, clearAll: clearAllTimers } = useTimer();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextHighlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighlightedRef = useRef<number[]>([]);
  const isProcessingRef = useRef(false);
  const currentHighlightedRef = useRef<number[]>([]);
  const highlightStartTimeRef = useRef<number | null>(null);
  // State version of highlightStartTime for memo dependency tracking
  // (ref alone doesn't trigger re-renders, causing stale values in memoized data)
  const [highlightStartTimeState, setHighlightStartTimeState] = useState<number | null>(null);
  const isPausedRef = useRef(false);
  const [screenFlash, setScreenFlash] = useState<'error' | 'success' | 'combo-5' | 'combo-10' | 'combo-20' | 'combo-30' | 'combo-50' | null>(null);
  const [highlightDuration, setHighlightDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [buttonPressFeedback, setButtonPressFeedback] = useState<Record<number, 'correct' | 'incorrect' | null>>({});
  const [buttonReactionTimes, setButtonReactionTimes] = useState<Record<number, number | null>>({});
  const [oddOneOutTarget, setOddOneOutTarget] = useState<number | null>(null);
  
  // Track previous values for performance feedback
  const previousComboRef = useRef(0);
  const previousScoreRef = useRef(0);
  const [currentReactionTime, setCurrentReactionTime] = useState<number | null>(null);
  const [isNewBestReaction, setIsNewBestReaction] = useState(false);
  
  // Track combo milestones for celebration effects (5, 10, 20, 30, 50)
  const [comboMilestone, setComboMilestone] = useState<number | null>(null);
  const lastMilestoneRef = useRef<number>(0);
  // Bonus target & micro-objectives
  const [bonusButtonId, setBonusButtonId] = useState<number | null>(null);
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusHighlightDuration, setBonusHighlightDuration] = useState<number | null>(null);
  const [fastStreakCount, setFastStreakCount] = useState(0);
  const [fastStreakActive, setFastStreakActive] = useState(false);
  
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
  }, [combo, screenFlashEnabled, reducedEffects, soundEnabled]);
  
  // Update previous values when combo/score change
  useEffect(() => {
    previousComboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    previousScoreRef.current = score;
  }, [score]);

  
  // Sequence mode state
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized keybinding map for control hints - only recalculates when keybindings change
  const keybindingHints: Record<number, string> = useMemo(() => {
    const bindings =
      typeof window === 'undefined' ? DEFAULT_KEYBINDINGS : getKeybindings();
    const result: Record<number, string> = {};
    for (let i = 1; i <= 10; i++) {
      result[i] = getKeyDisplayName(bindings[i]);
    }
    return result;
  }, []); // Empty deps since keybindings are stored in localStorage and we want to recalc on mount

  // Memoized button data for 3D grid to prevent unnecessary re-renders
  // Only recalculates when button states actually change
  const buttonGridData = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const id = i + 1;
      const feedback = buttonPressFeedback[id];
      const isHighlighted = highlightedButtons.includes(id);
      const isOddTarget = gameMode === 'oddOneOut' && oddOneOutTarget === id;
      // Only pass highlightStartTime when we have both a highlighted button AND a valid timestamp
      // This prevents undefined from being used in arithmetic (Date.now() - highlightStartTime)
      const validHighlightTime = isHighlighted && highlightStartTimeState !== null
        ? highlightStartTimeState
        : undefined;
      return {
        index: id,
        highlighted: isHighlighted,
        isBonus: bonusActive && bonusButtonId === id,
        isOddTarget,
        highlightStartTime: validHighlightTime,
        pressFeedback: (feedback === 'correct' ? 'success' : feedback === 'incorrect' ? 'error' : null) as 'success' | 'error' | null,
        reactionTime: buttonReactionTimes[id] ?? null,
      };
    });
  }, [highlightedButtons, buttonPressFeedback, highlightStartTimeState, gameMode, oddOneOutTarget, bonusActive, bonusButtonId, buttonReactionTimes]);

  // Clear highlight timer
  const clearHighlightTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimer(timerRef.current);
      timerRef.current = null;
    }
    if (nextHighlightTimerRef.current) {
      clearTimer(nextHighlightTimerRef.current);
      nextHighlightTimerRef.current = null;
    }
  }, [clearTimer]);

  // Keep a ref of the paused state for use in callbacks/timers
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Highlight new buttons
  const highlightNewButtons = useCallback(function highlightNewButtonsInternal() {
    if (gameOver || isProcessingRef.current || !isReady || isPausedRef.current) return;

    clearHighlightTimer();
    isProcessingRef.current = true;

    let newHighlighted: number[] = [];

    if (gameMode === 'oddOneOut') {
      // Odd One Out mode: always show a small cluster of buttons and pick a single correct target
      const baseCount = getButtonsToHighlightForDifficulty(score, difficulty);
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
      const buttonCount = getButtonsToHighlightForDifficulty(score, difficulty);
      newHighlighted = getRandomButtons(
        buttonCount,
        10,
        lastHighlightedRef.current
      );
      setOddOneOutTarget(null);

      // Occasionally spawn a bonus button in reflex / survival / nightmare
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
    const duration = getHighlightDurationForDifficulty(score, difficulty);
    setHighlightDuration(duration);
    setBonusHighlightDuration(bonusActive ? Math.max(200, duration * 0.6) : null);
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
  }, [score, difficulty, lives, isReady, setHighlightedButtons, decrementLives, clearHighlightTimer, soundEnabled, gameMode]);

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
        // Use startTransition for non-urgent UI updates to maintain FPS
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
        startTransition(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
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
      highlightedButtons,
      lives,
      isReady,
      reactionTimeStats,
      incrementScore,
      setHighlightedButtons,
      decrementLives,
      clearHighlightTimer,
      highlightNewButtons,
      soundEnabled,
      screenShakeEnabled,
      screenFlashEnabled,
      reducedEffects,
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
        setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
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
      highlightedButtons,
      oddOneOutTarget,
      reactionTimeStats,
      incrementScore,
      setHighlightedButtons,
      clearHighlightTimer,
      highlightNewButtons,
      lives,
      decrementLives,
      screenShakeEnabled,
      reducedEffects,
      soundEnabled,
      screenFlashEnabled,
      setTimer,
    ]
  );
  
  // Handle ready button click - actually start the game
  const handleReady = useCallback(() => {
    setIsReady(true);
    startGame();
  }, [startGame]);

  // Track if game has been initialized to prevent resetting on every render
  const hasInitializedRef = useRef(false);
  const isInitialMountRef = useRef(true);
  
  // Initialize game on mount - show loading screen once
  useEffect(() => {
    // Only run on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      
      // Ensure we're using the latest game mode and difficulty from context
      // The context state should already be updated from the selector, but we
      // verify it matches localStorage as a fallback to ensure consistency
      if (typeof window !== 'undefined') {
        const storedMode = localStorage.getItem('reflexthis_gameMode');
        const storedDifficulty = localStorage.getItem('reflexthis_difficulty');
        
        // If localStorage has different values than context, sync them
        // This handles the case where state updates haven't propagated yet
        if (storedMode && ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'].includes(storedMode) && storedMode !== gameMode) {
          setGameMode(storedMode as GameMode);
        }
        if (storedDifficulty && ['easy', 'medium', 'hard', 'nightmare'].includes(storedDifficulty) && storedDifficulty !== difficulty) {
          setDifficulty(storedDifficulty as DifficultyPreset);
        }
      }
      
      // Reset game first to ensure clean state (sets lives correctly based on game mode)
      // Use a small delay to ensure state updates are applied
      const initTimer = setTimer(() => {
        resetGame();
      }, 0);
      
      // LoadingScreen will handle calling handleReady() when it completes
      // No need for a separate timer - LoadingScreen takes ~3.3 seconds total
      
      return () => {
        clearTimer(initTimer);
      };
    }
  }, [resetGame, setTimer, clearTimer, gameMode, difficulty, setGameMode, setDifficulty]);

  // Start reflex/nightmare/oddOneOut game when component mounts or game resets (only after ready)
  useEffect(() => {
    if ((gameMode === 'reflex' || gameMode === 'nightmare' || gameMode === 'oddOneOut') && !gameOver && isReady && !isPaused) {
      // Small delay to ensure state is ready
      const startTimer = setTimer(() => {
        highlightNewButtons();
      }, 500);

      return () => {
        clearTimer(startTimer);
        clearHighlightTimer();
      };
    }
  }, [gameMode, gameOver, isReady, isPaused, highlightNewButtons, clearHighlightTimer]);

  // Sync ref with state
  useEffect(() => {
    currentHighlightedRef.current = highlightedButtons;
  }, [highlightedButtons]);

  // Restart reflex/survival/nightmare/oddOneOut game loop when game resets (only after ready)
  useEffect(() => {
    if (
      (gameMode === 'reflex' ||
        gameMode === 'survival' ||
        gameMode === 'nightmare' ||
        gameMode === 'oddOneOut') &&
      !gameOver &&
      isReady &&
      !isPaused &&
      highlightedButtons.length === 0 &&
      !isProcessingRef.current
    ) {
      const restartTimer = setTimer(() => {
        highlightNewButtons();
      }, 500);

      return () => clearTimer(restartTimer);
    }
  }, [gameMode, gameOver, isReady, isPaused, highlightedButtons.length, highlightNewButtons]);

  // Ensure survival mode always has 1 life (but not when game is over)
  useEffect(() => {
    if (gameMode === 'survival' && lives !== 1 && !gameOver) {
      setLives(1);
    }
  }, [gameMode, lives, setLives, gameOver]);
  
  // Mark game page as active when mounted, inactive when unmounted
  // Stop menu music when entering game page
  useEffect(() => {
    setGamePageActive(true);
    stopMenuMusic();
    return () => {
      setGamePageActive(false);
      // Clear all timers to prevent sounds from playing after navigation
      clearHighlightTimer();
      clearAllTimers();
      endGame();
    };
  }, [endGame, clearHighlightTimer, clearAllTimers]);

  // ========== SEQUENCE MODE LOGIC ==========
  
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
  }, [score, difficulty, gameOver, isReady, soundEnabled, clearHighlightTimer, setTimer]);
  
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
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
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
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
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
      isWaitingForInput,
      isShowingSequence,
      playerSequence,
      sequence,
      incrementScore,
      decrementLives,
      soundEnabled,
      showSequence,
      screenShakeEnabled,
      screenFlashEnabled,
      reducedEffects,
      setTimer,
    ]
  );
  
  // Start sequence game (only after ready)
  useEffect(() => {
    if (gameMode === 'sequence' && !gameOver && isReady && !isPaused && sequence.length === 0) {
      showSequence();
    }
  }, [gameMode, gameOver, isReady, isPaused, sequence.length, showSequence]);
  
  // Cleanup sequence timers
  useEffect(() => {
    return () => {
      if (sequenceTimerRef.current) {
        clearTimeout(sequenceTimerRef.current);
      }
    };
  }, []);

  // ========== END SEQUENCE MODE LOGIC ==========

  // Determine which button handler to use based on game mode
  const getButtonHandler = () => {
    if (gameMode === 'sequence') return handleSequenceButtonPress;
    if (gameMode === 'oddOneOut') return handleOddOneOutButtonPress;
    return handleReflexButtonPress;
  };
  
  // Keyboard controls - enabled when game is active, ready, not paused, and not showing sequence
  const keyboardEnabled = !gameOver && isReady && !isPaused && (gameMode !== 'sequence' || isWaitingForInput);
  const buttonHandler = getButtonHandler();
  useKeyboardControls(buttonHandler, keyboardEnabled);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pausedByMenu, setPausedByMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);

  const [screenShake, setScreenShake] = useState(false);

  // Prevent scrollbars during screen shake
  useEffect(() => {
    if (screenShake) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [screenShake]);

  // Prevent context menu, text selection, and drag globally
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventSelect = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent context menu
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Prevent drag events
    document.addEventListener('dragstart', preventDrag);
    document.addEventListener('drag', preventDrag);
    
    // Prevent text selection
    document.addEventListener('selectstart', preventSelect);
    document.addEventListener('mousedown', (e) => {
      // Prevent text selection on mouse down
      if (e.detail > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('drag', preventDrag);
      document.removeEventListener('selectstart', preventSelect);
    };
  }, []);

  // Helper to pause game and clear all active timers/highlights
  const pauseGameAndClearState = useCallback(() => {
    // Mark paused synchronously for any callbacks/timers that rely on the ref
    isPausedRef.current = true;
    pauseGame();
    clearHighlightTimer();
    if (nextHighlightTimerRef.current) {
      clearTimeout(nextHighlightTimerRef.current);
      nextHighlightTimerRef.current = null;
    }
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
    setHighlightedButtons([]);
    currentHighlightedRef.current = [];
    highlightStartTimeRef.current = null;
    setHighlightStartTimeState(null);
    setHighlightDuration(0);
    isProcessingRef.current = false;
  }, [pauseGame, clearHighlightTimer, setHighlightedButtons]);

  // Global ESC handler to pause game and show pause confirmation
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't interfere when settings modal is open
      if (showSettingsModal) return;
      // Only react during active gameplay
      if (!isReady || gameOver) return;

      e.preventDefault();

      if (showPauseModal) {
        // ESC while paused = continue
        setShowPauseModal(false);
        // Synchronously mark as unpaused for callbacks/timers
        isPausedRef.current = false;
        resumeGame();
        // If nothing is highlighted and we're not processing, kick off next highlight
        if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
          highlightNewButtons();
        }
        return;
      }

      // First ESC during gameplay → pause and show confirmation
      pauseGameAndClearState();
      setShowPauseModal(true);
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    showSettingsModal,
    isReady,
    gameOver,
    showPauseModal,
    resumeGame,
    highlightedButtons.length,
    highlightNewButtons,
    pauseGameAndClearState,
  ]);

  return (
    <>
      <AchievementNotification achievementIds={newlyUnlockedAchievements} />
      <OrientationHandler />
      {isLoading ? (
        <LoadingScreen
          message={t(language, 'loading.initializing')}
          onComplete={() => {
            setIsLoading(false);
            // Start game immediately when loading completes
            handleReady();
          }}
        />
      ) : (
      <div className={cn(
        "relative h-screen bg-background text-foreground flex flex-col overflow-hidden no-select",
        screenShake && "screen-shake-medium"
      )}>
      {/* Screen Flash Effect */}
      {screenFlash && screenFlashEnabled && (
        <ScreenFlash
          type={screenFlash}
          duration={reducedEffects ? 150 : undefined}
          highContrast={highContrastMode}
        />
      )}
      
      {/* Header */}
      <header className="relative z-10 p-2 sm:p-3 overflow-hidden flex justify-center">
        <RetroHudWidgets
          score={score}
          highScore={highScore}
          lives={effectiveLives}
          maxLives={maxLives}
          difficulty={difficulty}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          onToggleSound={toggleSound}
          onToggleMusic={toggleMusic}
          scoreBreakdown={lastScoreBreakdown}
          onQuit={() => {
            // Match ESC behavior: pause first and show confirmation
            if (!gameOver && isReady && !isPaused) {
              pauseGameAndClearState();
              setShowPauseModal(true);
            } else {
              endGame();
              router.push('/');
            }
          }}
          onOpenSettings={() => {
            if (!gameOver && isReady && !isPaused) {
              pauseGameAndClearState();
              setPausedByMenu(true);
            } else {
              setPausedByMenu(false);
            }
            setShowSettingsModal(true);
          }}
        />
      </header>
      
      {/* Performance Feedback */}
      <PerformanceFeedback
        reactionTime={currentReactionTime}
        combo={combo}
        score={score}
        previousCombo={previousComboRef.current}
        previousScore={previousScoreRef.current}
        isNewBestReaction={isNewBestReaction}
      />
      
      {/* Main Game Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-4 md:px-6 py-2 sm:py-4 overflow-hidden">
        {/* Vertical Combo Meter - Right Side */}
        <VerticalComboMeter
          combo={combo}
          difficulty={difficulty}
          reducedEffects={reducedEffects}
          position="right"
        />
        
        {/* Inline mode status + compact help toggle */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {/* Sequence status */}
          {gameMode === 'sequence' && (
            <div className="bg-card border-4 border-primary pixel-border px-4 py-2">
              {isShowingSequence ? (
                <div className="text-xs sm:text-sm font-bold text-primary">
                  {t(language, 'ready.sequence.watch')}
                </div>
              ) : isWaitingForInput ? (
                <div className="text-xs sm:text-sm font-bold text-secondary">
                  {t(language, 'ready.sequence.repeat')} {playerSequence.length}/{sequence.length}
                </div>
              ) : null}
            </div>
          )}

        </div>
        
        {/* 3D WebGL Button Grid */}
        <div className="w-full max-w-4xl">
          <div className="w-full h-[60vh] min-h-[280px] max-h-[720px]">
            <GameButtonGridWebGL
              buttons={buttonGridData}
              highlightDuration={highlightDuration}
              onPress={(index) => getButtonHandler()(index)}
              disabled={gameOver || isPaused || !isReady}
              keyLabels={keybindingHints}
              gameState={{
                combo,
                lives,
                maxLives,
                gameOver,
                score,
                difficulty,
                reducedEffects,
                gameMode,
              }}
              comboMilestone={comboMilestone}
            />
          </div>
        </div>
      </main>

      {/* Game Over Modal */}
      {gameOver && (
        <Suspense fallback={null}>
          <GameOverModal
          score={score}
          highScore={highScore}
          isNewHighScore={score > highScore && score > 0}
          bestCombo={bestCombo}
          reactionTimeStats={reactionTimeStats}
          onRestart={() => {
            // Reset the initialization flag so game can be reset properly
            hasInitializedRef.current = false;
            // Clear all local game state
            setSequence([]);
            setPlayerSequence([]);
            setIsShowingSequence(false);
            setIsWaitingForInput(false);
            setOddOneOutTarget(null);
            setBonusButtonId(null);
            setBonusActive(false);
            setFastStreakCount(0);
            setFastStreakActive(false);
            clearHighlightTimer();
            if (sequenceTimerRef.current) {
              clearTimer(sequenceTimerRef.current);
              sequenceTimerRef.current = null;
            }
            isProcessingRef.current = false;
            // Reset game state
            resetGame();
            // Set lives for survival mode immediately after reset
            if (gameMode === 'survival') {
              setLives(1);
            }
            // Ensure game is ready to start after reset
            // The game mode effects will automatically start the game when isReady is true
          }}
        />
        </Suspense>
      )}

      {/* Unified Settings Modal */}
      <Suspense fallback={null}>
        <SettingsModal
        show={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          if (pausedByMenu) {
            resumeGame();
            setPausedByMenu(false);
          }
        }}
      />
      </Suspense>

      {/* Pause Confirmation Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
          <div 
            className="border-4 pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_20px_rgba(62,124,172,0.4)]"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
          >
            <h2 
              className="text-2xl sm:text-3xl font-bold text-foreground mb-4 pixel-border px-4 py-2 inline-block"
              style={{ borderColor: '#3E7CAC' }}
            >
              {t(language, 'pause.title')}
            </h2>
            <p className="text-sm text-foreground/80 mb-6">
              {t(language, 'pause.message')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  // Synchronously mark as unpaused for callbacks/timers
                  isPausedRef.current = false;
                  resumeGame();
                  if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
                    highlightNewButtons();
                  }
                }}
                className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#3E7CAC',
                  backgroundColor: '#3E7CAC',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3E7CAC';
                }}
              >
                {t(language, 'pause.continue')}
              </button>
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  endGame();
                  router.push('/');
                }}
                className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#3E7CAC',
                  backgroundColor: 'rgba(0, 58, 99, 0.6)',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
                }}
              >
                {t(language, 'pause.exit')}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
      )}
    </>
  );
}

