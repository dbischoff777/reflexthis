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
import { playSound, setGamePageActive } from '@/lib/soundUtils';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ReadyScreen } from '@/components/ReadyScreen';
import { RetroHudWidgets } from '@/components/RetroHudWidgets';
import { DynamicAmbience } from '@/components/DynamicAmbience';
import { KeybindingsSettings } from '@/components/KeybindingsSettings';

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
  const [screenFlash, setScreenFlash] = useState<'error' | 'success' | null>(null);
  const [highlightDuration, setHighlightDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [buttonPressFeedback, setButtonPressFeedback] = useState<Record<number, 'correct' | 'incorrect' | null>>({});
  
  // Sequence mode state
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Highlight new buttons
  const highlightNewButtons = useCallback(function highlightNewButtonsInternal() {
    if (gameOver || isProcessingRef.current || !isReady) return;

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
        
        // Trigger screen shake for missed buttons
        setScreenShake(true);
        setTimeout(() => {
          setScreenShake(false);
        }, 400);
        
        setScreenFlash('error');
        setTimeout(() => setScreenFlash(null), 300);
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
      if (gameOver || !isReady || !highlightedButtons.length || isProcessingRef.current) {
        return;
      }

      if (highlightedButtons.includes(buttonId)) {
        // Calculate reaction time
        const reactionTime = highlightStartTimeRef.current
          ? Date.now() - highlightStartTimeRef.current
          : 0;

        // Correct button pressed - show feedback and particles
        setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: 'correct' }));
        setTimeout(() => {
          setButtonPressFeedback((prev) => ({ ...prev, [buttonId]: null }));
        }, 300);

        incrementScore(reactionTime);
        setScreenFlash('success');
        setTimeout(() => setScreenFlash(null), 200);

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

        // Trigger screen shake
        setScreenShake(true);
        setTimeout(() => {
          setScreenShake(false);
        }, 400);

        playSound('error', soundEnabled);
        setScreenFlash('error');
        setTimeout(() => setScreenFlash(null), 300);
        highlightStartTimeRef.current = null;
        setHighlightDuration(0);
        decrementLives();
      }
    },
    [
      highlightedButtons,
      gameOver,
      incrementScore,
      setHighlightedButtons,
      decrementLives,
      clearHighlightTimer,
      highlightNewButtons,
      soundEnabled,
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

  // Start reflex game when component mounts or game resets (only after ready)
  useEffect(() => {
    if (gameMode === 'reflex' && !gameOver && isReady) {
      // Small delay to ensure state is ready
      const startTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => {
        clearTimeout(startTimer);
        clearHighlightTimer();
      };
    }
  }, [gameMode, gameOver, isReady, highlightNewButtons, clearHighlightTimer]);

  // Sync ref with state
  useEffect(() => {
    currentHighlightedRef.current = highlightedButtons;
  }, [highlightedButtons]);

  // Restart reflex/survival game loop when game resets (only after ready)
  useEffect(() => {
    if ((gameMode === 'reflex' || gameMode === 'survival') && !gameOver && isReady && highlightedButtons.length === 0 && !isProcessingRef.current) {
      const restartTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => clearTimeout(restartTimer);
    }
  }, [gameMode, gameOver, isReady, highlightedButtons.length, highlightNewButtons]);

  // Ensure survival mode always has 1 life (but not when game is over)
  useEffect(() => {
    if (gameMode === 'survival' && lives !== 1 && !gameOver) {
      setLives(1);
    }
  }, [gameMode, lives, setLives, gameOver]);
  
  // Mark game page as active when mounted, inactive when unmounted
  useEffect(() => {
    setGamePageActive(true);
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
    if (gameOver || !isReady || isProcessingRef.current) return;
    
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
      if (gameOver || !isReady || !isWaitingForInput || isShowingSequence || isProcessingRef.current) {
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
          setScreenFlash('success');
          setTimeout(() => setScreenFlash(null), 200);
          
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

          // Trigger screen shake
          setScreenShake(true);
          setTimeout(() => {
            setScreenShake(false);
          }, 400);

          playSound('error', soundEnabled);
          setScreenFlash('error');
          setTimeout(() => setScreenFlash(null), 300);
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

          // Trigger screen shake
          setScreenShake(true);
          setTimeout(() => {
            setScreenShake(false);
          }, 400);

          playSound('error', soundEnabled);
          setScreenFlash('error');
          setTimeout(() => setScreenFlash(null), 300);
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
      isWaitingForInput,
      isShowingSequence,
      playerSequence,
      sequence,
      incrementScore,
      decrementLives,
      soundEnabled,
      showSequence,
    ]
  );
  
  // Start sequence game (only after ready)
  useEffect(() => {
    if (gameMode === 'sequence' && !gameOver && isReady && sequence.length === 0) {
      showSequence();
    }
  }, [gameMode, gameOver, isReady, sequence.length, showSequence]);
  
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
  
  // Keyboard controls - enabled when game is active, ready, and not showing sequence
  const keyboardEnabled = !gameOver && isReady && (gameMode !== 'sequence' || isWaitingForInput);
  const buttonHandler = getButtonHandler();
  useKeyboardControls(buttonHandler, keyboardEnabled);

  // Keybindings settings state
  const [showKeybindingsSettings, setShowKeybindingsSettings] = useState(false);

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
      {screenFlash && <ScreenFlash type={screenFlash} />}
      
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
            endGame();
            router.push('/');
          }}
          onOpenSettings={() => setShowKeybindingsSettings(true)}
        />
      </header>
      
      {/* Main Game Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Sequence Mode Status */}
        {gameMode === 'sequence' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-card border-4 border-primary pixel-border px-4 py-2">
              {isShowingSequence ? (
                <div className="text-sm font-bold text-primary">
                  Watch the sequence...
                </div>
              ) : isWaitingForInput ? (
                <div className="text-sm font-bold text-accent">
                  Repeat: {playerSequence.length}/{sequence.length}
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        <div className="button-grid w-full max-w-2xl">
          {/* Top Row - 3 buttons */}
          <div className="grid-row top-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
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
          
          {/* Middle Row - 4 buttons */}
          <div className="grid-row middle-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
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

      {/* Keybindings Settings */}
      {showKeybindingsSettings && (
        <KeybindingsSettings
          onClose={() => setShowKeybindingsSettings(false)}
        />
      )}

      </div>
      )}
    </>
  );
}

