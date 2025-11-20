'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { GameButton } from '@/components/GameButton';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { GameOverModal } from '@/components/GameOverModal';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { ComboDisplay } from '@/components/ComboDisplay';
import { ReactionTimeDisplay } from '@/components/ReactionTimeDisplay';
import { OrientationHandler } from '@/components/OrientationHandler';
import {
  getRandomButtons,
  getButtonsToHighlight,
  getHighlightDuration,
} from '@/lib/gameUtils';
import {
  getButtonsToHighlightForDifficulty,
  getHighlightDurationForDifficulty,
} from '@/lib/difficulty';
import { playSound, stopBackgroundMusic } from '@/lib/soundUtils';

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
    toggleSound,
    toggleMusic,
    resetGame,
    startGame,
    endGame,
    setHighlightedButtons,
    incrementScore,
    decrementLives,
  } = useGameState();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextHighlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighlightedRef = useRef<number[]>([]);
  const isProcessingRef = useRef(false);
  const currentHighlightedRef = useRef<number[]>([]);
  const highlightStartTimeRef = useRef<number | null>(null);

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
  const highlightNewButtons = useCallback(() => {
    if (gameOver || isProcessingRef.current) return;

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
    timerRef.current = setTimeout(() => {
      // Check if buttons are still highlighted (not pressed)
      if (currentHighlightedRef.current.length > 0) {
        setHighlightedButtons([]);
        currentHighlightedRef.current = [];
        highlightStartTimeRef.current = null;
        decrementLives();
      }
      
      // Schedule next highlight after a short delay (if game not over)
      if (!gameOver) {
        nextHighlightTimerRef.current = setTimeout(() => {
          highlightNewButtons();
        }, 1000);
      }
    }, duration);
  }, [score, difficulty, gameOver, setHighlightedButtons, decrementLives, clearHighlightTimer, soundEnabled]);

  // Handle button press
  const handleButtonPress = useCallback(
    (buttonId: number) => {
      if (gameOver || !highlightedButtons.length || isProcessingRef.current) {
        return;
      }

      if (highlightedButtons.includes(buttonId)) {
        // Calculate reaction time
        const reactionTime = highlightStartTimeRef.current
          ? Date.now() - highlightStartTimeRef.current
          : 0;

        // Correct button pressed
        incrementScore(reactionTime);

        // Remove this button from highlighted buttons
        const updatedHighlighted = highlightedButtons.filter(
          (id) => id !== buttonId
        );
        setHighlightedButtons(updatedHighlighted);
        currentHighlightedRef.current = updatedHighlighted;

        // If all highlighted buttons are pressed, reset highlight time
        if (updatedHighlighted.length === 0) {
          highlightStartTimeRef.current = null;
          clearHighlightTimer();
          nextHighlightTimerRef.current = setTimeout(() => {
            highlightNewButtons();
          }, 500);
        }
      } else {
        // Wrong button pressed - play error sound
        playSound('error', soundEnabled);
        highlightStartTimeRef.current = null;
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
    ]
  );

  // Start game when component mounts
  useEffect(() => {
    startGame();
  }, [startGame]);

  // Start game when component mounts or game resets
  useEffect(() => {
    if (!gameOver) {
      // Small delay to ensure state is ready
      const startTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => {
        clearTimeout(startTimer);
        clearHighlightTimer();
      };
    }
  }, [gameOver, highlightNewButtons, clearHighlightTimer]);

  // Sync ref with state
  useEffect(() => {
    currentHighlightedRef.current = highlightedButtons;
  }, [highlightedButtons]);

  // Restart game loop when game resets
  useEffect(() => {
    if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
      const restartTimer = setTimeout(() => {
        highlightNewButtons();
      }, 500);

      return () => clearTimeout(restartTimer);
    }
  }, [gameOver, highlightedButtons.length, highlightNewButtons]);

  // Stop game and music when component unmounts (e.g., when navigating away)
  useEffect(() => {
    return () => {
      endGame();
    };
  }, [endGame]);

  // Check if current score is a new high score
  const isNewHighScore = gameOver && score > 0 && score >= highScore;

  return (
    <>
      <OrientationHandler />
      <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden no-select">
        <CyberpunkBackground />
      
      {/* Header */}
      <header className="relative z-10 p-4 flex justify-between items-center border-b border-border/50 flex-wrap gap-2">
        {/* Left: Score, Combo, and Reaction Time */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base text-muted-foreground">Score:</span>
            <ScoreDisplay score={score} />
          </div>
          <ComboDisplay combo={combo} />
          <ReactionTimeDisplay stats={reactionTimeStats} />
        </div>
        
        {/* Center: Lives Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base text-muted-foreground">Lives:</span>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'text-lg sm:text-xl',
                  i < lives ? 'text-destructive' : 'text-muted opacity-30'
                )}
                aria-label={i < lives ? 'Life remaining' : 'Life lost'}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border hover:bg-card/80 hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
          </button>
          
          <button
            onClick={toggleMusic}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border hover:bg-card/80 hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
          >
            <span className="text-xl">{musicEnabled ? '🎵' : '🎶'}</span>
          </button>
          
          <button
            onClick={() => {
              endGame();
              router.push('/');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border hover:bg-card/80 hover:border-destructive/50 hover:text-destructive transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Quit game"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-auto">
        <div className="button-grid w-full max-w-2xl">
          {/* Top Row - 3 buttons */}
          <div className="grid-row top-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
            {[1, 2, 3].map((id) => (
              <GameButton
                key={id}
                id={id}
                highlighted={highlightedButtons.includes(id)}
                onPress={() => handleButtonPress(id)}
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
                onPress={() => handleButtonPress(id)}
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
                onPress={() => handleButtonPress(id)}
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
          onRestart={resetGame}
        />
      )}
      </div>
    </>
  );
}

