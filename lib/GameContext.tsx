'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { playSound, preloadSounds, playBackgroundMusic, stopBackgroundMusic, setBackgroundMusicVolume, setSoundEffectsVolume } from '@/lib/soundUtils';
import { getComboMultiplier } from '@/lib/gameUtils';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { saveGameSession, calculateSessionStatistics, SessionStatistics } from '@/lib/sessionStats';
import { GameMode } from '@/lib/gameModes';

export interface ReactionTimeStats {
  current: number | null;
  fastest: number | null;
  slowest: number | null;
  average: number | null;
  allTimes: number[];
}

export interface GameState {
  score: number;
  lives: number;
  highlightedButtons: number[];
  gameOver: boolean;
  isPaused: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  highScore: number;
  combo: number;
  bestCombo: number;
  reactionTimeStats: ReactionTimeStats;
  difficulty: DifficultyPreset;
  gameMode: GameMode;
  sessionStatistics: SessionStatistics;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setDifficulty: (difficulty: DifficultyPreset) => void;
  setGameMode: (mode: GameMode) => void;
  incrementScore: (reactionTime: number) => void;
  decrementLives: () => void;
  setHighlightedButtons: (buttonIds: number[]) => void;
  setLives: (lives: number) => void;
  resetGame: () => void;
  startGame: () => void;
  endGame: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

const STORAGE_KEYS = {
  SOUND_ENABLED: 'reflexthis_soundEnabled',
  MUSIC_ENABLED: 'reflexthis_musicEnabled',
  SOUND_VOLUME: 'reflexthis_soundVolume',
  MUSIC_VOLUME: 'reflexthis_musicVolume',
  HIGH_SCORE: 'reflexthis_highScore',
  BEST_COMBO: 'reflexthis_bestCombo',
  DIFFICULTY: 'reflexthis_difficulty',
  GAME_MODE: 'reflexthis_gameMode',
} as const;

export function GameProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [highlightedButtons, setHighlightedButtons] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(0.7);
  const [musicVolume, setMusicVolumeState] = useState(0.3);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyPreset>('custom');
  const [gameMode, setGameMode] = useState<GameMode>('reflex');
  const [sessionStatistics, setSessionStatistics] = useState<SessionStatistics>(
    calculateSessionStatistics()
  );
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const gameStartTimeRef = useRef<number | null>(null);
  const [reactionTimeStats, setReactionTimeStats] = useState<ReactionTimeStats>({
    current: null,
    fastest: null,
    slowest: null,
    average: null,
    allTimes: [],
  });

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

        // Load best combo
        const savedBestCombo = localStorage.getItem(STORAGE_KEYS.BEST_COMBO);
        if (savedBestCombo !== null) {
          const parsed = parseInt(savedBestCombo, 10);
          if (!isNaN(parsed)) {
            setBestCombo(parsed);
          }
        }

        // Load difficulty preference
        const savedDifficulty = localStorage.getItem(STORAGE_KEYS.DIFFICULTY);
        if (savedDifficulty && ['easy', 'medium', 'hard', 'custom'].includes(savedDifficulty)) {
          setDifficulty(savedDifficulty as DifficultyPreset);
        }

        // Load game mode preference
        const savedMode = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
        if (savedMode && ['reflex', 'sequence', 'survival'].includes(savedMode)) {
          setGameMode(savedMode as GameMode);
        }

        // Load volumes
        const savedSoundVolume = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
        const savedMusicVolume = localStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME);
        if (savedSoundVolume !== null) {
          const parsed = parseFloat(savedSoundVolume);
          if (!isNaN(parsed)) {
            setSoundVolumeState(parsed);
            setSoundEffectsVolume(parsed);
          }
        } else {
          setSoundEffectsVolume(0.7);
        }
        if (savedMusicVolume !== null) {
          const parsed = parseFloat(savedMusicVolume);
          if (!isNaN(parsed)) {
            setMusicVolumeState(parsed);
            setBackgroundMusicVolume(parsed);
          }
        } else {
          setBackgroundMusicVolume(0.3);
        }

        // Preload sounds for better performance
        preloadSounds();
      }
    }, []);

  // Save sound preference to localStorage
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;

      // When turning off, also set volume to 0
      if (!newValue) {
        setSoundVolumeState(0);
        setSoundEffectsVolume(0);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(0));
        }
      } else if (soundVolume === 0) {
        // When turning on from 0 volume, restore to a reasonable default
        const defaultVolume = 0.7;
        setSoundVolumeState(defaultVolume);
        setSoundEffectsVolume(defaultVolume);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(defaultVolume));
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(newValue));
      }
      return newValue;
    });
  }, [soundVolume]);

  // Save music preference to localStorage and control music playback
  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const newValue = !prev;

      // When turning off, also set volume to 0
      if (!newValue) {
        setMusicVolumeState(0);
        setBackgroundMusicVolume(0);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(0));
        }
      } else if (musicVolume === 0) {
        // When turning on from 0 volume, restore to a reasonable default
        const defaultVolume = 0.3;
        setMusicVolumeState(defaultVolume);
        setBackgroundMusicVolume(defaultVolume);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(defaultVolume));
        }
      }

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
  }, [gameOver, musicVolume]);

  const setSoundVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setSoundVolumeState(clamped);
    // Update enabled flag based on volume
    setSoundEnabled(clamped > 0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(clamped > 0));
      localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(clamped));
    }
    setSoundEffectsVolume(clamped);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setMusicVolumeState(clamped);
    // Update enabled flag based on volume
    setMusicEnabled(clamped > 0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(clamped > 0));
      localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(clamped));
    }
    setBackgroundMusicVolume(clamped);
  }, []);

  // Set difficulty preset
  const handleSetDifficulty = useCallback((newDifficulty: DifficultyPreset) => {
    setDifficulty(newDifficulty);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DIFFICULTY, newDifficulty);
    }
  }, []);

  // Set game mode
  const handleSetGameMode = useCallback((newMode: GameMode) => {
    setGameMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.GAME_MODE, newMode);
    }
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Increment score with combo multiplier and track reaction time
  const incrementScore = useCallback((reactionTime: number) => {
    // Update reaction time stats
    setReactionTimeStats((prev) => {
      const newTimes = [...prev.allTimes, reactionTime];
      const average = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
      const fastest = prev.fastest === null ? reactionTime : Math.min(prev.fastest, reactionTime);
      const slowest = prev.slowest === null ? reactionTime : Math.max(prev.slowest, reactionTime);

      return {
        current: reactionTime,
        fastest,
        slowest,
        average,
        allTimes: newTimes,
      };
    });

    // Increase combo and update score in one go
    setCombo((prevCombo) => {
      const newCombo = prevCombo + 1;
      
      // Update best combo
      if (newCombo > bestCombo) {
        setBestCombo(newCombo);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.BEST_COMBO, String(newCombo));
        }
      }
      
      // Calculate score with combo multiplier
      const comboMultiplier = getComboMultiplier(newCombo);
      const pointsGained = Math.floor(1 * comboMultiplier);
      setScore((prev) => prev + pointsGained);
      
      return newCombo;
    });
    
    playSound('success', soundEnabled);
  }, [soundEnabled, bestCombo]);

  // Track if game over sound has been played to prevent duplicates
  const gameOverSoundPlayedRef = useRef(false);
  
  // Reset game over sound flag when game resets
  useEffect(() => {
    if (!gameOver) {
      gameOverSoundPlayedRef.current = false;
    }
  }, [gameOver]);
  
  // Decrement lives and check for game over
  const decrementLives = useCallback(() => {
    // Don't decrement if already game over
    if (gameOver) return;
    
    // Reset combo on error
    setCombo(0);
    
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
        // Only play game over sound once
        if (!gameOverSoundPlayedRef.current) {
          gameOverSoundPlayedRef.current = true;
          playSound('gameOver', soundEnabled);
        }
      } else {
        playSound('lifeLost', soundEnabled);
      }
      return newLives;
    });
  }, [soundEnabled, gameOver]);

  // Check and update high score when game ends, and save session
  useEffect(() => {
    if (gameOver && typeof window !== 'undefined') {
      setIsPaused(false);
      const currentHighScore = parseInt(
        localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0',
        10
      );
      
      if (score > currentHighScore) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
        setHighScore(score);
      }
      
      // Save game session
      if (gameStartTimeRef.current) {
        const duration = Date.now() - gameStartTimeRef.current;
        saveGameSession({
          id: `game_${Date.now()}`,
          score,
          bestCombo: bestCombo > 0 ? bestCombo : combo,
          averageReactionTime: reactionTimeStats.average,
          fastestReactionTime: reactionTimeStats.fastest,
          totalPresses: reactionTimeStats.allTimes.length,
          difficulty,
          timestamp: Date.now(),
          duration,
        });
        
        // Update session statistics
        setSessionStatistics(calculateSessionStatistics());
        gameStartTimeRef.current = null;
      }
      
      // Mark game as ended
      setIsGameStarted(false);
      
      // Stop background music when game ends
      stopBackgroundMusic();
    }
  }, [gameOver, score, bestCombo, combo, reactionTimeStats, difficulty]);

  // Control background music based on game state and music preference
  // Only start music when we're actually in a game session (game has started)
  useEffect(() => {
    const isGameActive = !gameOver && isGameStarted && !isPaused;
    
    if (isGameActive && musicEnabled) {
      // Start music when game is active and music is enabled
      playBackgroundMusic(true);
    } else {
      // Stop music when game is over, music is disabled, or not in a game session
      stopBackgroundMusic();
    }

    // Cleanup on unmount
    return () => {
      stopBackgroundMusic();
    };
  }, [gameOver, musicEnabled, isGameStarted, isPaused]);

  // Start game (called when game page mounts)
  const startGame = useCallback(() => {
    if (!isGameStarted && !gameOver) {
      setIsGameStarted(true);
      setIsPaused(false);
      gameStartTimeRef.current = Date.now(); // Track game start time
    }
  }, [isGameStarted, gameOver]);

  // End game (called when leaving game page)
  const endGame = useCallback(() => {
    setIsGameStarted(false);
    setIsPaused(false);
    gameStartTimeRef.current = null;
    stopBackgroundMusic();
  }, []);

  // Reset game state
  const resetGame = useCallback(() => {
    setScore(0);
    // Set lives based on game mode: survival = 1, others = 5
    setLives(gameMode === 'survival' ? 1 : 5);
    setHighlightedButtons([]);
    setGameOver(false);
    setCombo(0);
    setIsGameStarted(true); // Mark that game has started
    setIsPaused(false);
    setReactionTimeStats({
      current: null,
      fastest: null,
      slowest: null,
      average: null,
      allTimes: [],
    });
    gameStartTimeRef.current = Date.now(); // Track game start time
    // Music will restart automatically via useEffect when gameOver becomes false and isGameStarted is true
  }, [gameMode]);

  return (
    <GameContext.Provider
      value={{
        score,
        lives,
        highlightedButtons,
        gameOver,
        isPaused,
        soundEnabled,
        musicEnabled,
        soundVolume,
        musicVolume,
        highScore,
        combo,
        bestCombo,
        reactionTimeStats,
        difficulty,
        gameMode,
        sessionStatistics,
        toggleSound,
        toggleMusic,
        setSoundVolume,
        setMusicVolume,
        pauseGame,
        resumeGame,
        setDifficulty: handleSetDifficulty,
        setGameMode: handleSetGameMode,
        incrementScore,
        decrementLives,
        setHighlightedButtons,
        setLives,
        resetGame,
        startGame,
        endGame,
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

