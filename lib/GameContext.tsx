'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { playSound, preloadSounds, playBackgroundMusic, stopBackgroundMusic, setBackgroundMusicVolume, setSoundEffectsVolume, playMenuMusic, stopMenuMusic, setMenuMusicVolume, getIsGamePageActive } from '@/lib/soundUtils';
import { getComboMultiplier } from '@/lib/gameUtils';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { saveGameSession, calculateSessionStatistics, SessionStatistics, getGameSessions } from '@/lib/sessionStats';
import { GameMode } from '@/lib/gameModes';
import type { Language } from '@/lib/i18n';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { localStorageBatcher } from '@/lib/localStorageBatch';
import { ScoreCalculator, ScoringFactors } from '@/lib/scoring';
import { AdaptiveDifficulty, DifficultyChangeLog } from '@/lib/adaptiveDifficulty';
import { submitChallengeResult } from '@/lib/challenges';
import { calculateXP, addXP, getUserProgress } from '@/lib/progression';

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
  screenShakeEnabled: boolean;
  screenFlashEnabled: boolean;
  reducedEffects: boolean;
  highContrastMode: boolean;
  newlyUnlockedAchievements: string[];
  levelUpInfo: { level: number; rewards?: import('@/lib/progression').LevelReward[] } | null;
  language: Language;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setScreenShakeEnabled: (enabled: boolean) => void;
  setScreenFlashEnabled: (enabled: boolean) => void;
  setReducedEffects: (enabled: boolean) => void;
  setHighContrastMode: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
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
  lastScoreBreakdown: ScoringFactors | null;
  adaptiveDifficultyChangeLog: DifficultyChangeLog[];
  adaptiveDifficultyMultiplier: number;
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
  SCREEN_SHAKE_ENABLED: 'reflexthis_screenShakeEnabled',
  SCREEN_FLASH_ENABLED: 'reflexthis_screenFlashEnabled',
  REDUCED_EFFECTS: 'reflexthis_reducedEffects',
  HIGH_CONTRAST_MODE: 'reflexthis_highContrastMode',
  LANGUAGE: 'reflexthis_language',
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
  const [difficulty, setDifficulty] = useState<DifficultyPreset>('medium');
  const [gameMode, setGameMode] = useState<GameMode>('reflex');
  const [sessionStatistics, setSessionStatistics] = useState<SessionStatistics>(
    calculateSessionStatistics()
  );
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [screenShakeEnabled, setScreenShakeEnabledState] = useState(true);
  const [screenFlashEnabled, setScreenFlashEnabledState] = useState(true);
  const [reducedEffects, setReducedEffectsState] = useState(false);
  const [highContrastMode, setHighContrastModeState] = useState(false);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<string[]>([]);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; rewards?: import('@/lib/progression').LevelReward[] } | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [adaptiveDifficultyMultiplier, setAdaptiveDifficultyMultiplier] = useState(1.0);

  const gameStartTimeRef = useRef<number | null>(null);
  const achievementClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const levelUpClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreCalculatorRef = useRef<ScoreCalculator | null>(null);
  const adaptiveDifficultyRef = useRef<AdaptiveDifficulty | null>(null);
  const [lastScoreBreakdown, setLastScoreBreakdown] = useState<ScoringFactors | null>(null);
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
        const savedSound = localStorageBatcher.getItem(STORAGE_KEYS.SOUND_ENABLED);
        if (savedSound !== null) {
          setSoundEnabled(savedSound === 'true');
        }

        // Load music preference
        const savedMusic = localStorageBatcher.getItem(STORAGE_KEYS.MUSIC_ENABLED);
        if (savedMusic !== null) {
          setMusicEnabled(savedMusic === 'true');
        }

        // Load high score
        const savedHighScore = localStorageBatcher.getItem(STORAGE_KEYS.HIGH_SCORE);
        if (savedHighScore !== null) {
          const parsed = parseInt(savedHighScore, 10);
          if (!isNaN(parsed)) {
            setHighScore(parsed);
          }
        }

        // Load best combo
        const savedBestCombo = localStorageBatcher.getItem(STORAGE_KEYS.BEST_COMBO);
        if (savedBestCombo !== null) {
          const parsed = parseInt(savedBestCombo, 10);
          if (!isNaN(parsed)) {
            setBestCombo(parsed);
          }
        }

        // Load difficulty preference
        const savedDifficulty = localStorageBatcher.getItem(STORAGE_KEYS.DIFFICULTY);
        if (savedDifficulty && ['easy', 'medium', 'hard', 'nightmare'].includes(savedDifficulty)) {
          setDifficulty(savedDifficulty as DifficultyPreset);
        }

        // Load game mode preference
        const savedMode = localStorageBatcher.getItem(STORAGE_KEYS.GAME_MODE);
        if (
          savedMode &&
          ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'].includes(savedMode)
        ) {
          setGameMode(savedMode as GameMode);
        }

        // Load volumes
        const savedSoundVolume = localStorageBatcher.getItem(STORAGE_KEYS.SOUND_VOLUME);
        const savedMusicVolume = localStorageBatcher.getItem(STORAGE_KEYS.MUSIC_VOLUME);
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
            setMenuMusicVolume(parsed);
          }
        } else {
          setBackgroundMusicVolume(0.3);
          setMenuMusicVolume(0.3);
        }

        // Load visual comfort settings
        const savedScreenShake = localStorageBatcher.getItem(STORAGE_KEYS.SCREEN_SHAKE_ENABLED);
        if (savedScreenShake !== null) {
          setScreenShakeEnabledState(savedScreenShake === 'true');
        }

        const savedScreenFlash = localStorageBatcher.getItem(STORAGE_KEYS.SCREEN_FLASH_ENABLED);
        if (savedScreenFlash !== null) {
          setScreenFlashEnabledState(savedScreenFlash === 'true');
        }

        const savedReducedEffects = localStorageBatcher.getItem(STORAGE_KEYS.REDUCED_EFFECTS);
        if (savedReducedEffects !== null) {
          setReducedEffectsState(savedReducedEffects === 'true');
        }

        const savedHighContrast = localStorageBatcher.getItem(STORAGE_KEYS.HIGH_CONTRAST_MODE);
        if (savedHighContrast !== null) {
          setHighContrastModeState(savedHighContrast === 'true');
        }

        const savedLanguage = localStorageBatcher.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
          setLanguageState(savedLanguage);
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
        localStorageBatcher.setItem(STORAGE_KEYS.SOUND_VOLUME, String(0));
      } else if (soundVolume === 0) {
        // When turning on from 0 volume, restore to a reasonable default
        const defaultVolume = 0.7;
        setSoundVolumeState(defaultVolume);
        setSoundEffectsVolume(defaultVolume);
        localStorageBatcher.setItem(STORAGE_KEYS.SOUND_VOLUME, String(defaultVolume));
      }

      localStorageBatcher.setItem(STORAGE_KEYS.SOUND_ENABLED, String(newValue));
      return newValue;
    });
  }, [soundVolume]);

  // Save music preference to localStorage and control music playback (context-aware)
  const toggleMusic = useCallback(() => {
    const isOnGamePage = getIsGamePageActive();
    
    setMusicEnabled((prev) => {
      const newValue = !prev;

      // When turning off, also set volume to 0
      if (!newValue) {
        setMusicVolumeState(0);
        setBackgroundMusicVolume(0);
        setMenuMusicVolume(0);
        localStorageBatcher.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(0));
      } else if (musicVolume === 0) {
        // When turning on from 0 volume, restore to a reasonable default
        const defaultVolume = 0.3;
        setMusicVolumeState(defaultVolume);
        setBackgroundMusicVolume(defaultVolume);
        setMenuMusicVolume(defaultVolume);
        localStorageBatcher.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(defaultVolume));
      }

      localStorageBatcher.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(newValue));
      
      // Context-aware music control
      if (isOnGamePage) {
        // On game page: only control game music
        if (newValue && !gameOver) {
          playBackgroundMusic(true);
        } else {
          stopBackgroundMusic();
        }
      } else {
        // On landing page: only control menu music
        if (newValue) {
          playMenuMusic(true);
        } else {
          stopMenuMusic();
        }
      }
      
      return newValue;
    });
  }, [gameOver, musicVolume]);

  const setSoundVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setSoundVolumeState(clamped);
    // Update enabled flag based on volume
    setSoundEnabled(clamped > 0);
    localStorageBatcher.setItem(STORAGE_KEYS.SOUND_ENABLED, String(clamped > 0));
    localStorageBatcher.setItem(STORAGE_KEYS.SOUND_VOLUME, String(clamped));
    setSoundEffectsVolume(clamped);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const isOnGamePage = getIsGamePageActive();
    
    setMusicVolumeState(clamped);
    // Update enabled flag based on volume
    const isEnabled = clamped > 0;
    setMusicEnabled(isEnabled);
    localStorageBatcher.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(isEnabled));
    localStorageBatcher.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(clamped));
    
    // Context-aware volume updates - only update the volume for the currently active music
    if (isOnGamePage) {
      // On game page: only update game music volume
      setBackgroundMusicVolume(clamped);
    } else {
      // On landing page: only update menu music volume
      setMenuMusicVolume(clamped);
    }
    
    // Context-aware playback control
    if (isOnGamePage) {
      // On game page: only control game music
      if (isEnabled && !gameOver) {
        playBackgroundMusic(true);
      } else {
        stopBackgroundMusic();
      }
    } else {
      // On landing page: only control menu music
      if (isEnabled) {
        playMenuMusic(true);
      } else {
        stopMenuMusic();
      }
    }
  }, [gameOver]);

  const setScreenShakeEnabled = useCallback((enabled: boolean) => {
    setScreenShakeEnabledState(enabled);
    localStorageBatcher.setItem(STORAGE_KEYS.SCREEN_SHAKE_ENABLED, String(enabled));
  }, []);

  const setScreenFlashEnabled = useCallback((enabled: boolean) => {
    setScreenFlashEnabledState(enabled);
    localStorageBatcher.setItem(STORAGE_KEYS.SCREEN_FLASH_ENABLED, String(enabled));
  }, []);

  const setReducedEffects = useCallback((enabled: boolean) => {
    setReducedEffectsState(enabled);
    localStorageBatcher.setItem(STORAGE_KEYS.REDUCED_EFFECTS, String(enabled));
  }, []);

  const setHighContrastMode = useCallback((enabled: boolean) => {
    setHighContrastModeState(enabled);
    localStorageBatcher.setItem(STORAGE_KEYS.HIGH_CONTRAST_MODE, String(enabled));
  }, []);

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorageBatcher.setItem(STORAGE_KEYS.LANGUAGE, newLanguage);
  }, []);

  // Set difficulty preset
  const handleSetDifficulty = useCallback((newDifficulty: DifficultyPreset) => {
    setDifficulty(newDifficulty);
    // Write directly to localStorage (bypass batcher) for immediate persistence
    // This ensures the game page reads the correct value even if navigation happens quickly
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DIFFICULTY, newDifficulty);
    }
    // Also queue it in the batcher for consistency (in case of other reads)
    localStorageBatcher.setItem(STORAGE_KEYS.DIFFICULTY, newDifficulty);
  }, []);

  // Set game mode
  const handleSetGameMode = useCallback((newMode: GameMode) => {
    setGameMode(newMode);
    // Write directly to localStorage (bypass batcher) for immediate persistence
    // This ensures the game page reads the correct value even if navigation happens quickly
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.GAME_MODE, newMode);
    }
    // Also queue it in the batcher for consistency (in case of other reads)
    localStorageBatcher.setItem(STORAGE_KEYS.GAME_MODE, newMode);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Initialize score calculator when difficulty or game mode changes
  useEffect(() => {
    if (!scoreCalculatorRef.current) {
      scoreCalculatorRef.current = new ScoreCalculator(difficulty, gameMode);
    } else {
      // Update calculator if difficulty or mode changed
      scoreCalculatorRef.current = new ScoreCalculator(difficulty, gameMode);
    }
  }, [difficulty, gameMode]);

  // Initialize adaptive difficulty system
  useEffect(() => {
    if (!adaptiveDifficultyRef.current) {
      adaptiveDifficultyRef.current = new AdaptiveDifficulty(difficulty);
    } else {
      // Update if difficulty changed
      adaptiveDifficultyRef.current.stop();
      adaptiveDifficultyRef.current.reset();
      adaptiveDifficultyRef.current = new AdaptiveDifficulty(difficulty);
    }
    
    // Check if disabled in localStorage (opt-out)
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('reflexthis_adaptiveDifficulty_enabled');
      if (savedConfig === 'false' && adaptiveDifficultyRef.current) {
        adaptiveDifficultyRef.current.updateConfig({ enabled: false });
      } else if (adaptiveDifficultyRef.current) {
        // Enabled by default, start it
        adaptiveDifficultyRef.current.updateConfig({ enabled: true });
        adaptiveDifficultyRef.current.start();
      }
    } else if (adaptiveDifficultyRef.current) {
      // Start by default if no localStorage
      adaptiveDifficultyRef.current.start();
    }
  }, [difficulty]);

  // Start adaptive difficulty when game starts
  useEffect(() => {
    if (isGameStarted && !gameOver && !isPaused && adaptiveDifficultyRef.current) {
      const config = (adaptiveDifficultyRef.current as any).config;
      if (config?.enabled) {
        adaptiveDifficultyRef.current.start();
      }
    } else if (adaptiveDifficultyRef.current) {
      adaptiveDifficultyRef.current.stop();
    }
  }, [isGameStarted, gameOver, isPaused]);

  // Update adaptive difficulty multiplier periodically
  useEffect(() => {
    if (!adaptiveDifficultyRef.current) return;
    
    const interval = setInterval(() => {
      if (adaptiveDifficultyRef.current) {
        const multiplier = adaptiveDifficultyRef.current.getDifficultyMultiplier();
        setAdaptiveDifficultyMultiplier(multiplier);
      }
    }, 500); // Update every 500ms
    
    return () => clearInterval(interval);
  }, []);

  // Increment score with advanced multi-factor scoring system
  const incrementScore = useCallback((reactionTime: number) => {
    // Record action for adaptive difficulty
    if (adaptiveDifficultyRef.current) {
      adaptiveDifficultyRef.current.recordAction({
        timestamp: Date.now(),
        reactionTime,
        isCorrect: true,
        isMiss: false,
      });
    }

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

    // Increase combo and calculate score using advanced scoring system
    setCombo((prevCombo) => {
      const newCombo = prevCombo + 1;
      
      // Update best combo
      if (newCombo > bestCombo) {
        setBestCombo(newCombo);
        localStorageBatcher.setItem(STORAGE_KEYS.BEST_COMBO, String(newCombo));
      }
      
      // Calculate score using advanced scoring system
      if (scoreCalculatorRef.current) {
        const scoringFactors = scoreCalculatorRef.current.calculateScore(reactionTime, true, newCombo);
        setLastScoreBreakdown(scoringFactors);
        setScore((prev) => prev + scoringFactors.totalScore);
      } else {
        // Fallback to old system if calculator not initialized
        const comboMultiplier = getComboMultiplier(newCombo);
        const pointsGained = Math.floor(1 * comboMultiplier);
        setScore((prev) => prev + pointsGained);
      }
      
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
    
    // Record miss action for adaptive difficulty and update multiplier immediately
    if (adaptiveDifficultyRef.current) {
      adaptiveDifficultyRef.current.recordAction({
        timestamp: Date.now(),
        reactionTime: null,
        isCorrect: false,
        isMiss: true,
      });
      // Immediately update multiplier after recording error
      const multiplier = adaptiveDifficultyRef.current.getDifficultyMultiplier();
      setAdaptiveDifficultyMultiplier(multiplier);
    }
    
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
        localStorageBatcher.getItem(STORAGE_KEYS.HIGH_SCORE) || '0',
        10
      );
      
      if (score > currentHighScore) {
        localStorageBatcher.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
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
            gameMode,
            timestamp: Date.now(),
            duration,
          });
          
          // Calculate accuracy
          const totalPresses = reactionTimeStats.allTimes.length;
          const misses = 5 - lives;
          const accuracy = totalPresses > 0 ? totalPresses / (totalPresses + misses) : 0;

          // Submit challenge result if this was a challenge game
          let isChallenge = false;
          if (typeof window !== 'undefined') {
            const challengeData = sessionStorage.getItem('reflexthis_activeChallenge');
            if (challengeData) {
              try {
                const challenge = JSON.parse(challengeData);
                isChallenge = true;
                const userId = 'local-user'; // In a real app, this would be from auth
                submitChallengeResult(
                  challenge.id,
                  userId,
                  score,
                  {
                    reactionTime: reactionTimeStats.average || undefined,
                    accuracy,
                  }
                );
                
                // Clear challenge from sessionStorage
                sessionStorage.removeItem('reflexthis_activeChallenge');
              } catch (error) {
                console.error('Error submitting challenge result:', error);
              }
            }
          }

          // Award XP
          const xpGained = calculateXP({
            score,
            accuracy,
            difficulty,
            gameMode,
            duration,
            isChallenge,
          });

          // Add XP to user progress
          const levelUpResult = addXP(xpGained, 'game_completion');
          
          // Handle level-up notification
          if (levelUpResult.leveledUp && levelUpResult.newLevel) {
            setLevelUpInfo({
              level: levelUpResult.newLevel,
              rewards: levelUpResult.rewards,
            });
            
            // Clear level-up notification after 5 seconds
            if (levelUpClearTimeoutRef.current) {
              clearTimeout(levelUpClearTimeoutRef.current);
            }
            levelUpClearTimeoutRef.current = setTimeout(() => {
              setLevelUpInfo(null);
            }, 5000);
          }
        
        // Update session statistics - use requestIdleCallback for non-critical updates
        const updateStats = () => {
          const updatedStats = calculateSessionStatistics();
          setSessionStatistics(updatedStats);
          
          // Check and unlock achievements
          const sessions = getGameSessions();
          const newlyUnlocked = checkAndUnlockAchievements(updatedStats, sessions);
          if (newlyUnlocked.length > 0) {
            setNewlyUnlockedAchievements(newlyUnlocked);
            // Clear any existing timeout before creating a new one
            if (achievementClearTimeoutRef.current) {
              clearTimeout(achievementClearTimeoutRef.current);
            }
            // Clear after 5 seconds
            achievementClearTimeoutRef.current = setTimeout(() => {
              setNewlyUnlockedAchievements([]);
              achievementClearTimeoutRef.current = null;
            }, 5000);
          }
        };
        
        // Use requestIdleCallback for non-critical stats updates
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(updateStats, { timeout: 2000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(updateStats, 0);
        }
        
        gameStartTimeRef.current = null;
      }
      
      // Mark game as ended
      setIsGameStarted(false);
      
      // Stop background music when game ends
      stopBackgroundMusic();
    }
    
    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (achievementClearTimeoutRef.current) {
        clearTimeout(achievementClearTimeoutRef.current);
        achievementClearTimeoutRef.current = null;
      }
    };
  }, [gameOver, score, bestCombo, combo, reactionTimeStats.average, reactionTimeStats.fastest, reactionTimeStats.allTimes.length, difficulty, gameMode]);

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
      
      // Start adaptive difficulty when game starts
      if (adaptiveDifficultyRef.current) {
        const config = (adaptiveDifficultyRef.current as any).config;
        if (config?.enabled) {
          adaptiveDifficultyRef.current.start();
        }
      }
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
    setLastScoreBreakdown(null);
    setReactionTimeStats({
      current: null,
      fastest: null,
      slowest: null,
      average: null,
      allTimes: [],
    });
    // Reset score calculator
    if (scoreCalculatorRef.current) {
      scoreCalculatorRef.current.reset();
    }
    // Reset and restart adaptive difficulty
    if (adaptiveDifficultyRef.current) {
      adaptiveDifficultyRef.current.stop();
      adaptiveDifficultyRef.current.reset();
      const config = (adaptiveDifficultyRef.current as any).config;
      if (config?.enabled) {
        adaptiveDifficultyRef.current.start();
      }
    }
    gameStartTimeRef.current = Date.now(); // Track game start time
    // Music will restart automatically via useEffect when gameOver becomes false and isGameStarted is true
  }, [gameMode]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
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
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    highContrastMode,
    language,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setScreenShakeEnabled,
    setScreenFlashEnabled,
    setReducedEffects,
    setHighContrastMode,
    setLanguage,
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
    newlyUnlockedAchievements,
    levelUpInfo,
    lastScoreBreakdown,
    adaptiveDifficultyChangeLog: adaptiveDifficultyRef.current?.getChangeLog() || [],
    adaptiveDifficultyMultiplier,
  }), [
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
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    highContrastMode,
    language,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setScreenShakeEnabled,
    setScreenFlashEnabled,
    setReducedEffects,
    setHighContrastMode,
    setLanguage,
    pauseGame,
    resumeGame,
    handleSetDifficulty,
    handleSetGameMode,
    incrementScore,
    decrementLives,
    setHighlightedButtons,
    setLives,
    resetGame,
    startGame,
    endGame,
    newlyUnlockedAchievements,
    levelUpInfo,
    lastScoreBreakdown,
  ]);

  return (
    <GameContext.Provider value={contextValue}>
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

