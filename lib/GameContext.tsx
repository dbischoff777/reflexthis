'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { playSound, preloadSounds, playBackgroundMusic, stopBackgroundMusic } from '@/lib/soundUtils';

export interface GameState {
  score: number;
  lives: number;
  highlightedButtons: number[];
  gameOver: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  highScore: number;
  toggleSound: () => void;
  toggleMusic: () => void;
  incrementScore: () => void;
  decrementLives: () => void;
  setHighlightedButtons: (buttonIds: number[]) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

const STORAGE_KEYS = {
  SOUND_ENABLED: 'reflexthis_soundEnabled',
  MUSIC_ENABLED: 'reflexthis_musicEnabled',
  HIGH_SCORE: 'reflexthis_highScore',
} as const;

export function GameProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [highlightedButtons, setHighlightedButtons] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [highScore, setHighScore] = useState(0);

  // Load preferences from localStorage on mount and preload sounds
  useEffect(() => {
      // Load sound preference
      if (typeof window !== 'undefined') {
        const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
        if (savedSound !== null) {
          setSoundEnabled(savedSound === 'true');
        }

        // Load music preference
        const savedMusic = localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED);
        if (savedMusic !== null) {
          setMusicEnabled(savedMusic === 'true');
        }

        // Load high score
        const savedHighScore = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
        if (savedHighScore !== null) {
          const parsed = parseInt(savedHighScore, 10);
          if (!isNaN(parsed)) {
            setHighScore(parsed);
          }
        }

        // Preload sounds for better performance
        preloadSounds();
      }
    }, []);

  // Save sound preference to localStorage
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(newValue));
      }
      return newValue;
    });
  }, []);

  // Save music preference to localStorage and control music playback
  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(newValue));
      }
      
      // Control music playback
      if (newValue && !gameOver) {
        playBackgroundMusic(true);
      } else {
        stopBackgroundMusic();
      }
      
      return newValue;
    });
  }, [gameOver]);

  // Increment score
  const incrementScore = useCallback(() => {
    setScore((prev) => prev + 1);
    playSound('success', soundEnabled);
  }, [soundEnabled]);

  // Decrement lives and check for game over
  const decrementLives = useCallback(() => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
        playSound('gameOver', soundEnabled);
      } else {
        playSound('lifeLost', soundEnabled);
      }
      return newLives;
    });
  }, [soundEnabled]);

  // Check and update high score when game ends
  useEffect(() => {
    if (gameOver && typeof window !== 'undefined') {
      const currentHighScore = parseInt(
        localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0',
        10
      );
      
      if (score > currentHighScore) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
        setHighScore(score);
      }
      
      // Stop background music when game ends
      stopBackgroundMusic();
    }
  }, [gameOver, score]);

  // Control background music based on game state and music preference
  useEffect(() => {
    if (!gameOver && musicEnabled) {
      // Start music when game is active and music is enabled
      playBackgroundMusic(true);
    } else {
      // Stop music when game is over or music is disabled
      stopBackgroundMusic();
    }

    // Cleanup on unmount
    return () => {
      stopBackgroundMusic();
    };
  }, [gameOver, musicEnabled]);

  // Reset game state
  const resetGame = useCallback(() => {
    setScore(0);
    setLives(5);
    setHighlightedButtons([]);
    setGameOver(false);
    // Music will restart automatically via useEffect when gameOver becomes false
  }, []);

  return (
    <GameContext.Provider
      value={{
        score,
        lives,
        highlightedButtons,
        gameOver,
        soundEnabled,
        musicEnabled,
        highScore,
        toggleSound,
        toggleMusic,
        incrementScore,
        decrementLives,
        setHighlightedButtons,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

