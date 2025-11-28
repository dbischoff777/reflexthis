'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { GameButton } from '@/components/GameButton';
import { GameOverModal } from '@/components/GameOverModal';
import { OrientationHandler } from '@/components/OrientationHandler';
import { ScreenFlash } from '@/components/ScreenFlash';
import { getRandomButtons } from '@/lib/gameUtils';
import {
  getButtonsToHighlightForDifficulty,
  getHighlightDurationForDifficulty,
} from '@/lib/difficulty';
import {
  generateSequence,
  getSequenceLength,
  getSequenceTiming,
  checkSequence,
} from '@/lib/sequenceUtils';
import { playSound, setGamePageActive, stopMenuMusic } from '@/lib/soundUtils';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ReadyScreen } from '@/components/ReadyScreen';
import { RetroHudWidgets } from '@/components/RetroHudWidgets';
import { DynamicAmbience } from '@/components/DynamicAmbience';
import SettingsModal from '@/components/SettingsModal';
import { PerformanceFeedback } from '@/components/PerformanceFeedback';
import { getKeybindings, getKeyDisplayName, DEFAULT_KEYBINDINGS } from '@/lib/keybindings';

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
  } = useGameState();
  
  const maxLives = gameMode === 'survival' ? 1 : 5;
  // Clamp to avoid negative display values
  const effectiveLives = Math.max(0, Math.min(lives, maxLives));

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextHighlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighlightedRef = useRef<number[]>([]);
  const isProcessingRef = useRef(false);
  const currentHighlightedRef = useRef<number[]>([]);
  const highlightStartTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const [screenFlash, setScreenFlash] = useState<'error' | 'success' | null>(null);
  const [highlightDuration, setHighlightDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [buttonPressFeedback, setButtonPressFeedback] = useState<Record<number, 'correct' | 'incorrect' | null>>({});
  
  // Track previous values for performance feedback
  const previousComboRef = useRef(0);
  const previousScoreRef = useRef(0);
  const [currentReactionTime, setCurrentReactionTime] = useState<number | null>(null);
  const [isNewBestReaction, setIsNewBestReaction] = useState(false);
  
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

  // Derived keybinding map for control hints.
  // Computed on each render so updated keybindings from Settings are reflected immediately.
  const keybindingHints: Record<number, string> = (() => {
    const bindings =
      typeof window === 'undefined' ? DEFAULT_KEYBINDINGS : getKeybindings();
    const result: Record<number, string> = {};
    for (let i = 1; i <= 10; i++) {
      result[i] = getKeyDisplayName(bindings[i]);
    }
    return result;
  })();

  // Clear highlight timer
  const clearHighlightTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (nextHighlightTimerRef.current) {
      clearTimeout(nextHighlightTimerRef.current);
      nextHighlightTimerRef.current = null;
    }
  }, []);

  // Keep a ref of the paused state for use in callbacks/timers
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Highlight new buttons
  const highlightNewButtons = useCallback(function highlightNewButtonsInternal() {
    if (gameOver || isProcessingRef.current || !isReady || isPausedRef.current) return;

    clearHighlightTimer();
    isProcessingRef.current = true;

    const buttonCount = getButtonsToHighlightForDifficulty(score, difficulty);
    const newHighlighted = getRandomButtons(
      buttonCount,
      10,
      lastHighlightedRef.current
    );
    lastHighlightedRef.current = newHighlighted;

    setHighlightedButtons(newHighlighted);
    currentHighlightedRef.current = newHighlighted;
    highlightStartTimeRef.current = Date.now(); // Track when buttons were highlighted
    isProcessingRef.current = false;

    // Play highlight sound
    playSound('highlight', soundEnabled);

    // Set timer to clear highlight and penalize if not pressed in time
    const duration = getHighlightDurationForDifficulty(score, difficulty);
    setHighlightDuration(duration);
    timerRef.current = setTimeout(() => {
      // Check if buttons are still highlighted (not pressed)
      if (currentHighlightedRef.current.length > 0) {
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        
        // Trigger screen shake for missed buttons (respect comfort settings)
        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimeout(() => {
            setScreenShake(false);
          }, 400);
        }
        
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimeout(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }
        decrementLives();
      }
      
      // Schedule next highlight after a short delay (if game not over)
      if (!gameOver) {
        nextHighlightTimerRef.current = setTimeout(() => {
          highlightNewButtonsInternal();
        }, 1000);
      }
    }, duration);
  }, [score, difficulty, gameOver, isReady, setHighlightedButtons, decrementLives, clearHighlightTimer, soundEnabled]);

  // Handle button press (Reflex mode)
  const handleReflexButtonPress = useCallback(
    (buttonId: number) => {
      if (gameOver || isPausedRef.current || !isReady || !highlightedButtons.length || isProcessingRef.current) {
        return;
      }

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
        setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
        setTimeout(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
        }, 300);

        incrementScore(reactionTime);
        // Success flash (respect comfort settings)
        if (screenFlashEnabled) {
          setScreenFlash('success');
          setTimeout(
            () => setScreenFlash(null),
            reducedEffects ? 120 : 200
          );
        }
        
        // Reset reaction time after a short delay to allow feedback to process
        setTimeout(() => {
          setCurrentReactionTime(null);
          setIsNewBestReaction(false);
        }, 100);

        // Remove this button from highlighted buttons
        const updatedHighlighted = highlightedButtons.filter(
          (id) => id !== buttonId
        );
        setHighlightedButtons(updatedHighlighted);
        currentHighlightedRef.current = updatedHighlighted;

        // If all highlighted buttons are pressed, reset highlight time
        if (updatedHighlighted.length === 0) {
          highlightStartTimeRef.current = null;
          setHighlightDuration(0);
          clearHighlightTimer();
          nextHighlightTimerRef.current = setTimeout(() => {
            highlightNewButtons();
          }, 500);
        }
      } else {
        // Wrong button pressed - show feedback, screen shake, and error particles
        setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
        setTimeout(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
        }, 300);

        // Trigger screen shake (respect comfort settings)
        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimeout(() => {
            setScreenShake(false);
          }, 400);
        }

        playSound('error', soundEnabled);
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimeout(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }
        highlightStartTimeRef.current = null;
        setHighlightDuration(0);
        decrementLives();
      }
    },
    [
      highlightedButtons,
      gameOver,
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
      
      // Reset game first to ensure clean state (sets lives correctly based on game mode)
      resetGame();
      
      // Show loading screen briefly, then show ready screen
      const loadingTimer = setTimeout(() => {
        setIsLoading(false);
        // Ready screen will be shown, game starts when player clicks START
      }, 1500);
      
      return () => clearTimeout(loadingTimer);
    }
  }, [resetGame]);

  // Start reflex/nightmare game when component mounts or game resets (only after ready)
  useEffect(() => {
    if ((gameMode === 'reflex' || gameMode === 'nightmare') && !gameOver && isReady && !isPaused) {
      // Small delay to ensure state is ready
      const startTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => {
        clearTimeout(startTimer);
        clearHighlightTimer();
      };
    }
  }, [gameMode, gameOver, isReady, isPaused, highlightNewButtons, clearHighlightTimer]);

  // Sync ref with state
  useEffect(() => {
    currentHighlightedRef.current = highlightedButtons;
  }, [highlightedButtons]);

  // Restart reflex/survival/nightmare game loop when game resets (only after ready)
  useEffect(() => {
    if ((gameMode === 'reflex' || gameMode === 'survival' || gameMode === 'nightmare') && !gameOver && isReady && !isPaused && highlightedButtons.length === 0 && !isProcessingRef.current) {
      const restartTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => clearTimeout(restartTimer);
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
      if (nextHighlightTimerRef.current) {
        clearTimeout(nextHighlightTimerRef.current);
        nextHighlightTimerRef.current = null;
      }
      if (sequenceTimerRef.current) {
        clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      endGame();
    };
  }, [endGame, clearHighlightTimer]);

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
      sequenceTimerRef.current = setTimeout(() => {
        setHighlightedButtons([]);
        
        if (index < newSequence.length - 1) {
          // Gap before next button
          setTimeout(() => {
            showNextButton(index + 1);
          }, gapDuration);
        } else {
          // Sequence complete
          setTimeout(() => {
            setIsShowingSequence(false);
            setIsWaitingForInput(true);
            setHighlightedButtons([]);
            isProcessingRef.current = false;
          }, gapDuration);
        }
      }, displayDuration);
    };
    
    // Start showing sequence after a short delay
    setTimeout(() => {
      showNextButton(0);
    }, 500);
  }, [score, difficulty, gameOver, isReady, soundEnabled, clearHighlightTimer]);
  
  // Handle button press in sequence mode
  const handleSequenceButtonPress = useCallback(
    (buttonId: number) => {
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
            setTimeout(() => {
              setButtonPressFeedback((prev) => ({ ...prev, [id]: null }));
            }, 300);
          });

          incrementScore(0); // No reaction time in sequence mode
          
          // Update previous values for feedback tracking
          previousComboRef.current = combo;
          previousScoreRef.current = score;
          
        if (screenFlashEnabled) {
          setScreenFlash('success');
          setTimeout(() => setScreenFlash(null), reducedEffects ? 120 : 200);
        }
          
          // Generate next sequence
          setTimeout(() => {
            showSequence();
          }, 1000);
        } else {
          // Wrong sequence - show feedback for wrong button
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
          setTimeout(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
          }, 300);

        // Trigger screen shake (respect comfort settings)
        if (screenShakeEnabled && !reducedEffects) {
          setScreenShake(true);
          setTimeout(() => {
            setScreenShake(false);
          }, 400);
        }

        playSound('error', soundEnabled);
        if (screenFlashEnabled) {
          setScreenFlash('error');
          setTimeout(() => setScreenFlash(null), reducedEffects ? 150 : 300);
        }
          setPlayerSequence([]);
          decrementLives();
          
          // Restart sequence after error
          if (!gameOver) {
            setTimeout(() => {
              showSequence();
            }, 1500);
          }
        }
      } else {
        // Check if current input is correct so far
        if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
          // Wrong button pressed - show feedback
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'incorrect' }));
          setTimeout(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
          }, 300);

          // Trigger screen shake (respect comfort settings)
          if (screenShakeEnabled && !reducedEffects) {
            setScreenShake(true);
            setTimeout(() => {
              setScreenShake(false);
            }, 400);
          }

          playSound('error', soundEnabled);
          if (screenFlashEnabled) {
            setScreenFlash('error');
            setTimeout(
              () => setScreenFlash(null),
              reducedEffects ? 150 : 300
            );
          }
          setPlayerSequence([]);
          decrementLives();
          
          // Restart sequence after error
          if (!gameOver) {
            setTimeout(() => {
              showSequence();
            }, 1500);
          }
        } else {
          // Correct so far - show feedback
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
          setTimeout(() => {
            setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
          }, 300);
          
          playSound('success', soundEnabled);
        }
      }
    },
    [
      gameOver,
      isReady,
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
    return gameMode === 'sequence' ? handleSequenceButtonPress : handleReflexButtonPress;
  };
  
  // Keyboard controls - enabled when game is active, ready, not paused, and not showing sequence
  const keyboardEnabled = !gameOver && isReady && !isPaused && (gameMode !== 'sequence' || isWaitingForInput);
  const buttonHandler = getButtonHandler();
  useKeyboardControls(buttonHandler, keyboardEnabled);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pausedByMenu, setPausedByMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showModeHelp, setShowModeHelp] = useState(false);

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
      <OrientationHandler />
      {isLoading ? (
        <LoadingScreen
          message="INITIALIZING"
          onComplete={() => setIsLoading(false)}
        />
      ) : !isReady ? (
        <ReadyScreen
          onReady={handleReady}
          gameMode={gameMode}
        />
      ) : (
      <div className={cn(
        "relative h-screen bg-background text-foreground flex flex-col overflow-hidden no-select",
        screenShake && "screen-shake-medium"
      )}>
          <DynamicAmbience />
      
      {/* Screen Flash Effect */}
      {screenFlash && screenFlashEnabled && (
        <ScreenFlash
          type={screenFlash}
          duration={reducedEffects ? 150 : undefined}
          highContrast={highContrastMode}
        />
      )}
      
      {/* Header */}
      <header className="relative z-10 p-2 sm:p-3 border-b-4 border-primary bg-card/40 pixel-border overflow-hidden flex justify-center">
        <RetroHudWidgets
          score={score}
          highScore={highScore}
          combo={combo}
          lives={effectiveLives}
          maxLives={maxLives}
          difficulty={difficulty}
          gameMode={gameMode}
          reactionStats={reactionTimeStats}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          onToggleSound={toggleSound}
          onToggleMusic={toggleMusic}
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
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Inline mode status + compact help toggle */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {/* Sequence status */}
          {gameMode === 'sequence' && (
            <div className="bg-card border-4 border-primary pixel-border px-4 py-2">
              {isShowingSequence ? (
                <div className="text-xs sm:text-sm font-bold text-primary">
                  Watch the sequence...
                </div>
              ) : isWaitingForInput ? (
                <div className="text-xs sm:text-sm font-bold text-secondary">
                  Repeat: {playerSequence.length}/{sequence.length}
                </div>
              ) : null}
            </div>
          )}

          {/* Compact mode pill with ? toggle */}
          <div className="flex items-center gap-2 bg-card/80 border-2 border-border px-3 py-1 rounded-sm pixel-border text-[12px] sm:text-sm">
            <span className="font-semibold text-primary uppercase">
              {gameMode === 'reflex' && 'Reflex'}
              {gameMode === 'sequence' && 'Sequence'}
              {gameMode === 'survival' && 'Survival'}
              {gameMode === 'nightmare' && 'Nightmare'}
            </span>
            <button
              type="button"
              onClick={() => setShowModeHelp((prev) => !prev)}
              className="ml-1 h-5 w-5 flex items-center justify-center border border-border rounded-sm bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Toggle mode help"
            >
              ?
            </button>
          </div>

          {/* Small help popup when toggled */}
          {showModeHelp && (
            <div className="mt-1 bg-card/95 border-2 border-primary pixel-border px-3 py-2 max-w-xs shadow-lg">
              {gameMode === 'reflex' && (
                <p className="text-[12px] sm:text-sm text-foreground/80 break-words">
                  Hit highlighted buttons quickly and avoid mistakes to keep your combo and score growing.
                </p>
              )}
              {gameMode === 'sequence' && (
                <p className="text-[12px] sm:text-sm text-foreground/80 break-words">
                  Watch the pattern, then press the same buttons in order without errors.
                </p>
              )}
              {gameMode === 'survival' && (
                <p className="text-[12px] sm:text-sm text-foreground/80 break-words">
                  One life only – every mistake ends the run, and difficulty rises fast.
                </p>
              )}
              {gameMode === 'nightmare' && (
                <p className="text-[12px] sm:text-sm text-foreground/80 break-words">
                  Extreme speed and difficulty – for elite players only. Up to 6 buttons, 150ms minimum reaction time.
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="button-grid w-full max-w-2xl">
          {/* Top Row - 3 buttons */}
          <div className="grid-row top-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
            {[1, 2, 3].map((id) => (
              <GameButton
                key={id}
                id={id}
                highlighted={highlightedButtons.includes(id)}
                onPress={() => getButtonHandler()(id)}
                highlightStartTime={highlightStartTimeRef.current || undefined}
                highlightDuration={highlightDuration}
                pressFeedback={buttonPressFeedback[id] || null}
              />
            ))}
          </div>
          {/* Top row key hints */}
          <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6 text-[12px] sm:text-sm text-foreground/70 font-mono">
            {[1, 2, 3].map((id) => (
              <span key={id} className="min-w-[40px] text-center opacity-80">
                {keybindingHints[id]}
              </span>
            ))}
          </div>
          
          {/* Middle Row - 4 buttons */}
          <div className="grid-row middle-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
            {[4, 5, 6, 7].map((id) => (
              <GameButton
                key={id}
                id={id}
                highlighted={highlightedButtons.includes(id)}
                onPress={() => getButtonHandler()(id)}
                highlightStartTime={highlightStartTimeRef.current || undefined}
                highlightDuration={highlightDuration}
                pressFeedback={buttonPressFeedback[id] || null}
              />
            ))}
          </div>
          {/* Middle row key hints */}
          <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6 text-[12px] sm:text-sm text-foreground/70 font-mono">
            {[4, 5, 6, 7].map((id) => (
              <span key={id} className="min-w-[40px] text-center opacity-80">
                {keybindingHints[id]}
              </span>
            ))}
          </div>
          
          {/* Bottom Row - 3 buttons */}
          <div className="grid-row bottom-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {[8, 9, 10].map((id) => (
              <GameButton
                key={id}
                id={id}
                highlighted={highlightedButtons.includes(id)}
                onPress={() => getButtonHandler()(id)}
                highlightStartTime={highlightStartTimeRef.current || undefined}
                highlightDuration={highlightDuration}
                pressFeedback={buttonPressFeedback[id] || null}
              />
            ))}
          </div>
          {/* Bottom row key hints */}
          <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mt-2 sm:mt-3 md:mt-4 lg:mt-6 text-[12px] sm:text-sm text-foreground/70 font-mono">
            {[8, 9, 10].map((id) => (
              <span key={id} className="min-w-[40px] text-center opacity-80">
                {keybindingHints[id]}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Game Over Modal */}
      {gameOver && (
        <GameOverModal
          score={score}
          highScore={highScore}
          isNewHighScore={score > highScore && score > 0}
          bestCombo={bestCombo}
          reactionTimeStats={reactionTimeStats}
          onRestart={() => {
            // Reset the initialization flag so game can be reset properly
            hasInitializedRef.current = false;
            setIsReady(false); // Show ready screen again
            resetGame();
            // Set lives for survival mode immediately after reset
            if (gameMode === 'survival') {
              setLives(1);
            }
          }}
        />
      )}

      {/* Unified Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => {
            setShowSettingsModal(false);
            if (pausedByMenu) {
              resumeGame();
              setPausedByMenu(false);
            }
          }}
        />
      )}

      {/* Pause Confirmation Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="bg-card border-4 border-primary pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 pixel-border px-4 py-2 inline-block">
              GAME PAUSED
            </h2>
            <p className="text-sm text-foreground/80 mb-6">
              Press ESC or CONTINUE to resume, or EXIT to return to the main menu.
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
                className="px-6 py-3 border-4 border-primary bg-primary text-primary-foreground pixel-border font-bold hover:bg-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                CONTINUE
              </button>
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  endGame();
                  router.push('/');
                }}
                className="px-6 py-3 border-4 border-secondary bg-secondary text-secondary-foreground pixel-border font-bold hover:bg-secondary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                EXIT
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

