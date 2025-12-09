'use client';

import { useRef, useEffect, useCallback } from 'react';
import { GameMode } from '@/lib/gameModes';
import { DifficultyPreset } from '@/lib/difficulty';

interface UseGameInitializationOptions {
  isLoading: boolean;
  isReady: boolean;
  gameMode: GameMode;
  difficulty: DifficultyPreset;
  tutorialLoaded: boolean;
  tutorialCompletion: Record<GameMode, boolean>;
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (difficulty: DifficultyPreset) => void;
  resetGame: () => void;
  setTimer: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimer: (timer: NodeJS.Timeout) => void;
  openTutorial: (mode: GameMode, autoStartAfter: boolean, resumeAfter: boolean) => void;
  startGameplay: () => void;
}

export function useGameInitialization({
  isLoading,
  isReady,
  gameMode,
  difficulty,
  tutorialLoaded,
  tutorialCompletion,
  setGameMode,
  setDifficulty,
  resetGame,
  setTimer,
  clearTimer,
  openTutorial,
  startGameplay,
}: UseGameInitializationOptions) {
  const hasInitializedRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const handleReady = useCallback(() => {
    if (!tutorialLoaded) return;
    if (!tutorialCompletion[gameMode]) {
      openTutorial(gameMode, true, false);
      return;
    }
    startGameplay();
  }, [tutorialLoaded, tutorialCompletion, gameMode, openTutorial, startGameplay]);

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

  // When loading finishes, decide whether to show tutorial or start immediately
  useEffect(() => {
    if (!isLoading && !isReady) {
      handleReady();
    }
  }, [isLoading, isReady, handleReady]);

  return {
    handleReady,
    hasInitializedRef,
  };
}

