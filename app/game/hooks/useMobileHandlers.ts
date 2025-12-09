'use client';

import { useCallback } from 'react';

interface UseMobileHandlersOptions {
  isReady: boolean;
  gameOver: boolean;
  isPaused: boolean;
  highlightedButtons: number[];
  isProcessingRef: React.MutableRefObject<boolean>;
  isPausedRef: React.MutableRefObject<boolean>;
  pauseGameAndClearState: () => void;
  resetGame: () => void;
  setIsReady: (ready: boolean) => void;
  startGame: () => void;
  resumeGame: () => void;
  highlightNewButtons: () => void;
  setShowPauseModal: (show: boolean) => void;
}

export function useMobileHandlers({
  isReady,
  gameOver,
  isPaused,
  highlightedButtons,
  isProcessingRef,
  isPausedRef,
  pauseGameAndClearState,
  resetGame,
  setIsReady,
  startGame,
  resumeGame,
  highlightNewButtons,
  setShowPauseModal,
}: UseMobileHandlersOptions) {
  const restartForMobile = useCallback(() => {
    pauseGameAndClearState();
    resetGame();
    setIsReady(true);
    startGame();
  }, [pauseGameAndClearState, resetGame, setIsReady, startGame]);

  const togglePauseForMobile = useCallback(() => {
    if (!isReady || gameOver) return;
    if (isPaused) {
      setShowPauseModal(false);
      isPausedRef.current = false;
      resumeGame();
      if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
        highlightNewButtons();
      }
    } else {
      pauseGameAndClearState();
      setShowPauseModal(true);
    }
  }, [
    gameOver,
    highlightNewButtons,
    highlightedButtons.length,
    isPaused,
    isReady,
    pauseGameAndClearState,
    resumeGame,
    isPausedRef,
    isProcessingRef,
    setShowPauseModal,
  ]);

  return {
    restartForMobile,
    togglePauseForMobile,
  };
}

