'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { GameButtonGridWebGL } from '@/components/GameButton3DWebGL';
import { OrientationHandler } from '@/components/OrientationHandler';
import { ScreenFlash } from '@/components/ScreenFlash';
import { setGamePageActive, stopMenuMusic } from '@/lib/soundUtils';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RetroHudWidgets } from '@/components/RetroHudWidgets';
import { PerformanceFeedback } from '@/components/PerformanceFeedback';
import { AchievementNotification } from '@/components/AchievementNotification';
import { VerticalComboMeter } from '@/components/VerticalComboMeter';
import { getKeybindings, getKeyDisplayName, DEFAULT_KEYBINDINGS } from '@/lib/keybindings';
import { t } from '@/lib/i18n';
import { lazy, Suspense } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useDeviceProfile } from '@/hooks/useDeviceProfile';
import { MobileGestures } from '@/components/MobileGestures';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { BackgroundVideo } from './components/BackgroundVideo';
import { PauseModal } from './components/PauseModal';
import { useTutorial } from './hooks/useTutorial';
import { useComboMilestones } from './hooks/useComboMilestones';
import { useScreenEffects } from './hooks/useScreenEffects';
import { useHighlightButtons } from './hooks/useHighlightButtons';
import { useGameButtonHandlers } from './hooks/useGameButtonHandlers';
import { useSequenceMode } from './hooks/useSequenceMode';
import { useMobileHandlers } from './hooks/useMobileHandlers';
import { useGameInitialization } from './hooks/useGameInitialization';
import { loadChallenge } from '@/lib/challenges';
import { GameModeTitle } from '@/components/GameModeTitle';

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
  const activeChallengeRef = useRef<{ id: string; type: 'daily' | 'weekly' } | null>(null);
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
  
  // Multi-hit combo state: tracks required hits (2-3) and current hit count per button
  const [buttonHitRequirements, setButtonHitRequirements] = useState<Record<number, number>>({});
  const [buttonHitCounts, setButtonHitCounts] = useState<Record<number, number>>({});
  
  // Track previous values for performance feedback
  const previousComboRef = useRef(0);
  const previousScoreRef = useRef(0);
  const [currentReactionTime, setCurrentReactionTime] = useState<number | null>(null);
  const [isNewBestReaction, setIsNewBestReaction] = useState(false);
  // Bonus target & micro-objectives
  const [bonusButtonId, setBonusButtonId] = useState<number | null>(null);
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusHighlightDuration, setBonusHighlightDuration] = useState<number | null>(null);
  const [fastStreakCount, setFastStreakCount] = useState(0);
  const [fastStreakActive, setFastStreakActive] = useState(false);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pausedByMenu, setPausedByMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);

  const { deviceInfo, quality } = useDeviceProfile();
  
  // Screen effects hook - must be before useHighlightButtons
  const { screenShake, setScreenShake } = useScreenEffects({
    screenShakeEnabled,
    reducedEffects,
  });
  
  // Combo milestones hook
  const { comboMilestone } = useComboMilestones({
    combo,
    soundEnabled,
    screenFlashEnabled,
    reducedEffects,
    setScreenFlash,
    setTimer,
    clearTimer,
  });

  // Update previous values when combo/score change
  useEffect(() => {
    previousComboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    previousScoreRef.current = score;
  }, [score]);

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
    setButtonHitRequirements({});
    setButtonHitCounts({});
    isProcessingRef.current = false;
  }, [pauseGame, clearHighlightTimer, setHighlightedButtons]);

  // Highlight new buttons hook
  const { highlightNewButtons, currentPattern } = useHighlightButtons({
    gameOver,
    isReady,
    isPausedRef,
    isProcessingRef,
    gameMode,
    score,
    difficulty,
    lives,
    soundEnabled,
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    setHighlightedButtons,
    setOddOneOutTarget,
    setBonusButtonId,
    setBonusActive,
    setHighlightDuration,
    setBonusHighlightDuration,
    setHighlightStartTimeState,
    setScreenShake,
    setScreenFlash,
    setButtonHitRequirements,
    decrementLives,
    clearHighlightTimer,
    setTimer,
    timerRef,
    nextHighlightTimerRef,
    lastHighlightedRef,
    currentHighlightedRef,
    highlightStartTimeRef,
  });

  const startGameplay = useCallback(() => {
    setIsReady(true);
    startGame();
  }, [startGame]);

  // Tutorial hook - must be after highlightNewButtons is defined
  const {
    tutorialMode,
    tutorialStepIndex,
    setTutorialStepIndex,
    showTutorialOverlay,
    tutorialCompletion,
    tutorialLoaded,
    tutorialStepsByMode,
    openTutorial,
    handleTutorialFinish,
  } = useTutorial({
    language,
    pauseGameAndClearState,
    startGameplay,
    resumeGame,
    gameOver,
    highlightedButtons,
    isProcessingRef,
    highlightNewButtons,
  });

  // Mobile handlers hook
  const { restartForMobile, togglePauseForMobile } = useMobileHandlers({
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
  });

  
  // Sequence mode hook
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latencyMonitorRef = useRef<{ recordFeedback: (buttonId: number) => void } | undefined>(undefined);
  const {
    sequence,
    playerSequence,
    isShowingSequence,
    isWaitingForInput,
    showSequence,
    handleSequenceButtonPress,
    resetSequence,
  } = useSequenceMode({
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
  });

  // Auto-start sequence mode when ready
  useEffect(() => {
    if (
      gameMode === 'sequence' &&
      !gameOver &&
      isReady &&
      !isPaused &&
      !isProcessingRef.current &&
      sequence.length === 0 &&
      !isShowingSequence &&
      !isWaitingForInput
    ) {
      showSequence();
    }
  }, [
    gameMode,
    gameOver,
    isReady,
    isPaused,
    isProcessingRef,
    sequence.length,
    isShowingSequence,
    isWaitingForInput,
    showSequence,
  ]);

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
    const pattern = currentPattern?.current;
    const patternButtons = pattern?.buttons || [];
    
    return Array.from({ length: 10 }, (_, i) => {
      const id = i + 1;
      const feedback = buttonPressFeedback[id];
      const isHighlighted = highlightedButtons.includes(id);
      const isOddTarget = gameMode === 'oddOneOut' && oddOneOutTarget === id;
      const isPatternButton = patternButtons.includes(id);
      const requiredHits = buttonHitRequirements[id] || 1;
      const currentHits = buttonHitCounts[id] || 0;
      const remainingHits = requiredHits > 1 ? requiredHits - currentHits : 0;
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
        isPatternButton,
        highlightStartTime: validHighlightTime,
        pressFeedback: (feedback === 'correct' ? 'success' : feedback === 'incorrect' ? 'error' : null) as 'success' | 'error' | null,
        reactionTime: buttonReactionTimes[id] ?? null,
        requiredHits,
        remainingHits,
      };
    });
  }, [highlightedButtons, buttonPressFeedback, highlightStartTimeState, gameMode, oddOneOutTarget, bonusActive, bonusButtonId, buttonReactionTimes, currentPattern, buttonHitRequirements, buttonHitCounts]);

  // Keep a ref of the paused state for use in callbacks/timers
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Game button handlers hook
  const { handleReflexButtonPress, handleOddOneOutButtonPress } = useGameButtonHandlers({
    gameOver,
    isReady,
    isPausedRef,
    isProcessingRef,
    gameMode,
    highlightedButtons,
    oddOneOutTarget,
    bonusActive,
    bonusButtonId,
    fastStreakActive,
    maxLives,
    lives,
    reactionTimeStats,
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    soundEnabled,
    highlightStartTimeRef,
    currentHighlightedRef,
    nextHighlightTimerRef,
    latencyMonitorRef,
    currentPatternRef: currentPattern,
    buttonHitRequirements,
    buttonHitCounts,
    setButtonPressFeedback,
    setButtonReactionTimes,
    setCurrentReactionTime,
    setIsNewBestReaction,
    setHighlightedButtons,
    setHighlightStartTimeState,
    setHighlightDuration,
    setOddOneOutTarget,
    setBonusActive,
    setBonusButtonId,
    setBonusHighlightDuration,
    setScreenShake,
    setScreenFlash,
    setFastStreakCount,
    setFastStreakActive,
    setLives,
    setButtonHitCounts,
    incrementScore,
    decrementLives,
    clearHighlightTimer,
    highlightNewButtons,
    setTimer,
  });

  // OLD HANDLERS REMOVED - Now using useGameButtonHandlers hook
  
  // Check for active challenge on mount - must happen before game initialization
  useEffect(() => {
    if (typeof window !== 'undefined' && !isReady) {
      const challengeData = sessionStorage.getItem('reflexthis_activeChallenge');
      if (challengeData) {
        try {
          const challenge = JSON.parse(challengeData);
          activeChallengeRef.current = challenge;
          
          // Load challenge to get parameters
          const challengeDetails = loadChallenge(challenge.id);
          if (challengeDetails) {
            // Set game mode and difficulty from challenge
            // These will be used when the game initializes
            setGameMode(challengeDetails.parameters.gameMode);
            setDifficulty(challengeDetails.parameters.difficulty);
          }
        } catch (error) {
          console.error('Error loading challenge:', error);
          // Clear invalid challenge data
          sessionStorage.removeItem('reflexthis_activeChallenge');
        }
      }
    }
  }, [setGameMode, setDifficulty, isReady]);

  // Game initialization hook
  const { handleReady, hasInitializedRef } = useGameInitialization({
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
  });

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

  // Sequence mode logic is now in useSequenceMode hook

  // Determine which button handler to use based on game mode
  const getButtonHandler = () => {
    if (gameMode === 'sequence') return handleSequenceButtonPress;
    if (gameMode === 'oddOneOut') return handleOddOneOutButtonPress;
    return handleReflexButtonPress;
  };
  
  // Keyboard controls - enabled when game is active, ready, not paused, and not showing sequence
  const keyboardEnabled = !gameOver && isReady && !isPaused && (gameMode !== 'sequence' || isWaitingForInput);
  const buttonHandler = getButtonHandler();
  const { latencyMonitor } = useKeyboardControls(buttonHandler, keyboardEnabled, true, true);
  
  // Update latencyMonitor ref for sequence mode hook
  useEffect(() => {
    latencyMonitorRef.current = latencyMonitor || undefined;
  }, [latencyMonitor]);

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
      <MobileGestures
        enabled={deviceInfo.touchEnabled && deviceInfo.isMobile}
        onSwipeUp={restartForMobile}
        onSwipeDown={togglePauseForMobile}
        onSwipeLeft={() => setShowSettingsModal(true)}
      />
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
      {/* Background Video */}
      {!reducedEffects && <BackgroundVideo />}
      {/* Dark overlay for better text readability - increased opacity for better contrast */}
      <div className={`fixed inset-0 z-1 ${reducedEffects ? 'bg-black/70' : 'bg-black/55'}`} aria-hidden="true" />
      
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
        
        {/* Inline mode status - Enhanced visibility */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {/* Sequence status */}
          {gameMode === 'sequence' && (
            <div
              className="border-4 pixel-border px-5 py-3 shadow-[0_0_18px_rgba(62,124,172,0.5)]"
              style={{ backgroundColor: 'rgba(0, 58, 99, 0.9)', borderColor: '#3E7CAC' }}
            >
              {isShowingSequence ? (
                <div className="text-sm sm:text-base md:text-lg font-bold text-primary text-glow">
                  {t(language, 'ready.sequence.watch')}
                </div>
              ) : isWaitingForInput ? (
                <div className="text-sm sm:text-base md:text-lg font-bold text-secondary text-glow">
                  {t(language, 'ready.sequence.repeat')} {playerSequence.length}/{sequence.length}
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        {/* 3D WebGL Button Grid - Larger, more prominent */}
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 relative">
          {/* Game Mode Title and Icon - Positioned outside canvas border at top-left */}
          {isReady && !gameOver && (
            <GameModeTitle gameMode={gameMode} reducedEffects={reducedEffects} />
          )}
          
          <div
            className="w-full game-area-3d relative mx-auto"
            style={{
              height: deviceInfo.isMobile ? '75vh' : '72vh',
              minHeight: deviceInfo.isMobile ? '400px' : '480px',
              maxHeight: deviceInfo.isMobile ? '900px' : '1000px',
              maxWidth: '100%',
              aspectRatio: '16 / 9',
            }}
          >
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
              performance={{
                maxDpr: quality.maxDpr,
                renderScale: quality.renderScale,
                gridScale: quality.gridScale,
                disablePostprocessing: quality.disablePostprocessing,
                powerPreference: quality.powerPreference,
              }}
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
          gameMode={gameMode}
          difficulty={difficulty}
          newlyUnlockedAchievementIds={newlyUnlockedAchievements}
          onRestart={() => {
            // Reset the initialization flag so game can be reset properly
            hasInitializedRef.current = false;
            // Clear all local game state
            resetSequence();
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
      <PauseModal
        show={showPauseModal}
        language={language}
        onContinue={() => {
          setShowPauseModal(false);
          // Synchronously mark as unpaused for callbacks/timers
          isPausedRef.current = false;
          resumeGame();
          if (!gameOver && highlightedButtons.length === 0 && !isProcessingRef.current) {
            highlightNewButtons();
          }
        }}
        onExit={() => {
          setShowPauseModal(false);
          endGame();
          router.push('/');
        }}
      />

      <TutorialOverlay
        show={showTutorialOverlay}
        steps={tutorialMode ? tutorialStepsByMode[tutorialMode] : []}
        stepIndex={tutorialStepIndex}
        onStepChange={setTutorialStepIndex}
        onComplete={() => handleTutorialFinish(true)}
        onSkip={() => handleTutorialFinish(true)}
        onClose={() => handleTutorialFinish(true)}
        title={
          tutorialMode
            ? `${tutorialMode.charAt(0).toUpperCase()}${tutorialMode.slice(1)} tutorial`
            : 'Tutorial'
        }
      />

      </div>
      )}
    </>
  );
}

