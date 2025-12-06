'use client';

import { useEffect, useState, useMemo } from 'react';
import { GameMode, GAME_MODES } from '@/lib/gameModes';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { SlideTransition, FadeTransition } from '@/components/Transition';

interface ModeAndDifficultySelectorProps {
  selectedMode: GameMode;
  selectedDifficulty: DifficultyPreset;
  onStart: (mode: GameMode, difficulty: DifficultyPreset) => void;
  onCancel?: () => void;
  onShowStats?: (mode: GameMode) => void;
  disabled?: boolean;
}

/**
 * Combined Mode and Difficulty Selector component
 * Shows both mode and difficulty selection in one unified view
 */
export function ModeAndDifficultySelector({
  selectedMode,
  selectedDifficulty,
  onStart,
  onCancel,
  onShowStats,
  disabled = false,
}: ModeAndDifficultySelectorProps) {
  const { language, sessionStatistics } = useGameState();
  const modes: GameMode[] = ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'];
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
  const [hoveredDifficulty, setHoveredDifficulty] = useState<DifficultyPreset | null>(null);
  const [localMode, setLocalMode] = useState<GameMode>(selectedMode);
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>(selectedDifficulty);
  
  // Track which section to show - always start with mode selection
  const [showModeSelection, setShowModeSelection] = useState<boolean>(true);
  const [showDifficultySelection, setShowDifficultySelection] = useState<boolean>(false);
  const [showStartButton, setShowStartButton] = useState<boolean>(false);

  // Sync local state with props when they change (but don't change section visibility)
  useEffect(() => {
    // Only sync if we're not actively in a selection flow
    // This prevents the component from jumping to different sections when props change
    if (showModeSelection) {
      // Reset to initial state when in mode selection
      setLocalMode(selectedMode);
      setLocalDifficulty(selectedDifficulty);
    }
  }, [selectedMode, selectedDifficulty, showModeSelection]);

  // Auto-select nightmare difficulty when nightmare mode is chosen
  useEffect(() => {
    if (localMode === 'nightmare') {
      setLocalDifficulty('nightmare');
    } else if (localDifficulty === 'nightmare') {
      // If switching away from nightmare mode, reset to easy
      setLocalDifficulty('easy');
    }
  }, [localMode, localDifficulty]);

  // Handle mode selection - transition to difficulty selection
  const handleModeSelect = (mode: GameMode) => {
    if (!disabled) {
      setLocalMode(mode);
      // Auto-select nightmare difficulty if nightmare mode, otherwise default to easy
      if (mode === 'nightmare') {
        setLocalDifficulty('nightmare');
      } else {
        setLocalDifficulty('easy'); // Default to easy
      }
      
      // Transition to difficulty selection
      setShowModeSelection(false);
      setTimeout(() => {
        setShowDifficultySelection(true);
      }, 300); // Wait for exit animation
    }
  };

  // Handle difficulty selection - transition to start button
  const handleDifficultySelect = (difficulty: DifficultyPreset) => {
    if (!disabled) {
      setLocalDifficulty(difficulty);
      
      // Transition to start button
      setShowDifficultySelection(false);
      setTimeout(() => {
        setShowStartButton(true);
      }, 300); // Wait for exit animation
    }
  };

  // Handle back button - go back to mode selection
  const handleBackToModes = () => {
    setShowDifficultySelection(false);
    setShowStartButton(false);
    setTimeout(() => {
      setShowModeSelection(true);
      // Reset local selections to initial prop values to go back to mode selection
      // Don't call onCancel() as that would navigate away - just reset state
      setLocalMode(selectedMode);
      setLocalDifficulty(selectedDifficulty);
    }, 300);
  };

  // Handle back button from start button - go back to difficulty selection
  const handleBackToDifficulty = () => {
    setShowStartButton(false);
    setTimeout(() => {
      setShowDifficultySelection(true);
      // Reset difficulty but keep mode - default to easy
      if (localMode === 'nightmare') {
        setLocalDifficulty('nightmare');
      } else {
        setLocalDifficulty('easy');
      }
    }, 300);
  };

  // Get available difficulties based on selected mode
  const difficulties: DifficultyPreset[] = localMode === 'nightmare' 
    ? ['nightmare'] 
    : ['easy', 'medium', 'hard'];

  // Get recently played mode and difficulty
  const recentlyPlayedMode = useMemo(() => {
    if (sessionStatistics.recentGames.length > 0) {
      return sessionStatistics.recentGames[0].gameMode;
    }
    return null;
  }, [sessionStatistics.recentGames]);

  const recentlyPlayedDifficulty = useMemo(() => {
    if (sessionStatistics.recentGames.length > 0) {
      const difficulty = sessionStatistics.recentGames[0].difficulty;
      if (difficulty && ['easy', 'medium', 'hard', 'nightmare'].includes(difficulty)) {
        return difficulty as DifficultyPreset;
      }
    }
    return null;
  }, [sessionStatistics.recentGames]);

  // Get best score for a mode
  const getBestScoreForMode = (mode: GameMode) => {
    const modeGames = sessionStatistics.recentGames.filter(g => g.gameMode === mode);
    if (modeGames.length === 0) return null;
    return Math.max(...modeGames.map(g => g.score));
  };

  // Helper function to get button image path
  const getButtonImage = (mode: GameMode, isHovered: boolean, isSelected: boolean) => {
    const modeName = mode === 'oddOneOut' ? 'oddoneout' : mode;
    const state = (isHovered || isSelected) ? 'Hover' : 'Regular';
    return `/buttons/${modeName}${state}.png`;
  };

  const getModeDescription = (mode: GameMode) => {
    switch (mode) {
      case 'reflex': return t(language, 'ready.reflex.desc');
      case 'sequence': return t(language, 'ready.sequence.desc');
      case 'survival': return t(language, 'ready.survival.desc');
      case 'nightmare': return t(language, 'ready.nightmare.desc');
      case 'oddOneOut': return t(language, 'ready.odd.desc');
      default: return t(language, 'ready.default.desc');
    }
  };

  const getModeHowTo = (mode: GameMode) => {
    switch (mode) {
      case 'reflex': return t(language, 'mode.reflex.howto');
      case 'sequence': return t(language, 'mode.sequence.howto');
      case 'survival': return t(language, 'mode.survival.howto');
      case 'nightmare': return t(language, 'mode.nightmare.howto');
      case 'oddOneOut': return t(language, 'mode.odd.howto');
      default: return '';
    }
  };

  const getModeDuration = (mode: GameMode) => {
    switch (mode) {
      case 'reflex': return t(language, 'mode.reflex.duration');
      case 'sequence': return t(language, 'mode.sequence.duration');
      case 'survival': return t(language, 'mode.survival.duration');
      case 'nightmare': return t(language, 'mode.nightmare.duration');
      case 'oddOneOut': return t(language, 'mode.odd.duration');
      default: return '';
    }
  };

  const getDifficultyDescription = (preset: DifficultyPreset) => {
    switch (preset) {
      case 'easy': return t(language, 'difficulty.desc.easy');
      case 'medium': return t(language, 'difficulty.desc.medium');
      case 'hard': return t(language, 'difficulty.desc.hard');
      case 'nightmare': return t(language, 'difficulty.desc.nightmare');
      default: return '';
    }
  };

  // Icons and stars for each difficulty level
  const difficultyIcons: Record<DifficultyPreset, string> = {
    easy: '🌱',
    medium: '⚡',
    hard: '🔥',
    nightmare: '💀',
  };

  const difficultyStars: Record<DifficultyPreset, string> = {
    easy: t(language, 'difficulty.stars.easy'),
    medium: t(language, 'difficulty.stars.medium'),
    hard: t(language, 'difficulty.stars.hard'),
    nightmare: t(language, 'difficulty.stars.nightmare'),
  };

  // Handle ESC key to cancel and Enter for Quick Start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
      // Quick Start on Enter key (only when in mode selection)
      if (e.key === 'Enter' && showModeSelection && !disabled && onStart) {
        const quickMode: GameMode = (recentlyPlayedMode as GameMode) || 'reflex';
        const quickDifficulty: DifficultyPreset = recentlyPlayedDifficulty 
          ? (quickMode === 'nightmare' ? 'nightmare' : recentlyPlayedDifficulty)
          : (quickMode === 'nightmare' ? 'nightmare' : 'easy');
        onStart(quickMode, quickDifficulty);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, showModeSelection, disabled, onStart, recentlyPlayedMode, recentlyPlayedDifficulty]);

  const handleStart = () => {
    if (!disabled && localMode && localDifficulty) {
      onStart(localMode, localDifficulty);
    }
  };

  const getModeName = (mode: GameMode) => {
    switch (mode) {
      case 'reflex': return t(language, 'mode.reflex.name');
      case 'sequence': return t(language, 'mode.sequence.name');
      case 'survival': return t(language, 'mode.survival.name');
      case 'nightmare': return t(language, 'mode.nightmare.name');
      case 'oddOneOut': return t(language, 'mode.odd.name');
      default: return '';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto relative min-h-[400px]">
      {/* Mode Selection Grid - Slide transition */}
      <SlideTransition
        show={showModeSelection}
        direction="right"
        duration={300}
        className="absolute inset-0"
      >
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-white/80 text-left">
            {t(language, 'mode.select.title')}
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {modes.map((mode) => {
            const modeInfo = GAME_MODES[mode];
            const isSelected = localMode === mode;
            const isHovered = hoveredMode === mode;
            const buttonImage = getButtonImage(mode, isHovered, isSelected);
            const isRecentlyPlayed = recentlyPlayedMode === mode;
            const bestScore = getBestScoreForMode(mode);
            const isRecommended = mode === 'reflex' || mode === 'sequence';

            return (
              <div
                key={mode}
                className="relative"
                onMouseEnter={() => setHoveredMode(mode)}
                onMouseLeave={() => setHoveredMode(null)}
              >
                <button
                  onClick={() => handleModeSelect(mode)}
                  disabled={disabled}
                  draggable={false}
                  className={cn(
                    'relative w-full aspect-square rounded-2xl transition-all duration-200',
                    'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                    'flex flex-col overflow-hidden',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    // 3D effect with shadows
                    'shadow-[0_8px_16px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
                    isSelected && 'ring-4 ring-primary ring-offset-1 ring-offset-background shadow-[0_12px_24px_rgba(0,0,0,0.5),0_6px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]',
                    isSelected && 'scale-[1.02]',
                    !isSelected && 'hover:shadow-[0_10px_20px_rgba(0,0,0,0.45),0_5px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{
                    backgroundColor: (isHovered || isSelected) 
                      ? '#1BFFFE' // Bright cyan for hover/selected
                      : '#317FA3', // Teal/blue for regular
                  }}
                >
                  {/* Image container - larger icons */}
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2 pt-2 sm:px-3 sm:pt-3">
                    <img
                      src={buttonImage}
                      alt={modeInfo.name}
                      className="w-full h-full max-w-[95%] max-h-[95%] object-contain transition-opacity duration-200"
                      draggable={false}
                    />
                  </div>
                  {/* Label at bottom */}
                  <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 md:py-3 pointer-events-none shrink-0 gap-1">
                    <span className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                      {mode === 'reflex' && t(language, 'mode.reflex.name')}
                      {mode === 'sequence' && t(language, 'mode.sequence.name')}
                      {mode === 'survival' && t(language, 'mode.survival.name')}
                      {mode === 'nightmare' && t(language, 'mode.nightmare.name')}
                      {mode === 'oddOneOut' && t(language, 'mode.odd.name')}
                    </span>
                    {bestScore !== null && (
                      <span className="text-[10px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {t(language, 'mode.bestScore')}: {bestScore.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
          
          {/* Quick Start Button - Uses the empty spot in row 2 to maintain 3x3 grid symmetry */}
          {(() => {
            const quickMode: GameMode = (recentlyPlayedMode as GameMode) || 'reflex';
            const quickDifficulty: DifficultyPreset = recentlyPlayedDifficulty 
              ? (quickMode === 'nightmare' ? 'nightmare' : recentlyPlayedDifficulty)
              : (quickMode === 'nightmare' ? 'nightmare' : 'easy');
            
            return (
              <button
                onClick={() => {
                  if (!disabled && onStart) {
                    // Instant start - no transitions
                    onStart(quickMode, quickDifficulty);
                  }
                }}
                disabled={disabled}
                draggable={false}
                className={cn(
                  'relative w-full aspect-square rounded-2xl transition-all duration-200',
                  'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                  'flex flex-col items-center justify-center overflow-hidden',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  // Distinct 3D effect with green accent for quick action
                  'shadow-[0_8px_16px_rgba(0,255,160,0.3),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]',
                  'hover:shadow-[0_12px_24px_rgba(0,255,160,0.4),0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]',
                  'hover:scale-[1.03]',
                  'border-2',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  backgroundColor: '#00A86B', // Green background for quick action
                  borderColor: '#00FFA0', // Bright green border
                }}
              >
                <div className="flex flex-col items-center justify-center gap-2 px-2 flex-1">
                  <span className="text-5xl sm:text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">⚡</span>
                  <span className="font-bold text-sm sm:text-base text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] text-center">
                    Quick Start
                  </span>
                  {recentlyPlayedMode && (
                    <span className="text-[10px] sm:text-lg text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-center px-1">
                      {getModeName(quickMode)} • {quickDifficulty === 'easy' && t(language, 'difficulty.name.easy')}
                      {quickDifficulty === 'medium' && t(language, 'difficulty.name.medium')}
                      {quickDifficulty === 'hard' && t(language, 'difficulty.name.hard')}
                      {quickDifficulty === 'nightmare' && t(language, 'difficulty.name.nightmare')}
                    </span>
                  )}
                </div>
              </button>
            );
          })()}
          </div>
        </div>
      </SlideTransition>

      {/* Difficulty Selection Grid - Slide transition */}
      <SlideTransition
        show={showDifficultySelection}
        direction="right"
        duration={300}
        className="absolute inset-0"
      >
        <div className="flex flex-col gap-3">
          {/* Back button and Statistics button */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleBackToModes}
              disabled={disabled}
              draggable={false}
              className={cn(
                'px-3 py-1.5 text-sm font-semibold border-2 pixel-border',
                'transition-all duration-200 hover:opacity-90',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
                color: '#fff',
              }}
            >
              ← {t(language, 'mode.select.title')}
            </button>
            <h4 className="text-sm font-semibold text-white/80 flex-1 text-center">
              {t(language, 'difficulty.select.title')}
            </h4>
            {/* Statistics Button - Now in difficulty selection screen */}
            {onShowStats && localMode && (
              <button
                onClick={() => onShowStats(localMode)}
                disabled={disabled}
                draggable={false}
                className={cn(
                  'px-3 py-1.5 text-sm font-semibold border-2 rounded-xl',
                  'transition-all duration-200 hover:opacity-90 hover:scale-105',
                  'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2',
                  'shadow-[0_4px_8px_rgba(255,193,7,0.3)]',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  borderColor: '#FFD700',
                  backgroundColor: '#FFA500',
                  color: '#fff',
                }}
                title={t(language, 'landing.viewStats')}
              >
                📊
              </button>
            )}
          </div>
          
          {/* Selected mode indicator */}
          {localMode && (
            <div className="px-3 py-2 rounded-lg border-2 pixel-border" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.3)' }}>
              <span className="text-xs text-white/80">
                {t(language, 'mode.select.title')}: <span className="text-primary font-semibold">{getModeName(localMode)}</span>
              </span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-3">
            {difficulties.map((preset) => {
              const isSelected = localDifficulty === preset;
              const isHovered = hoveredDifficulty === preset;
              const description = getDifficultyDescription(preset);

              return (
                <div
                  key={preset}
                  className="relative"
                  onMouseEnter={() => setHoveredDifficulty(preset)}
                  onMouseLeave={() => setHoveredDifficulty(null)}
                >
                  <button
                    onClick={() => handleDifficultySelect(preset)}
                    disabled={disabled}
                    draggable={false}
                    className={cn(
                      'relative w-full aspect-square rounded-2xl transition-all duration-200',
                      'min-h-[70px] sm:min-h-[80px]',
                      'flex flex-col items-center justify-center overflow-hidden',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      'pt-2 pb-2',
                      // 3D effect with shadows - matching mode buttons
                      'shadow-[0_8px_16px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
                      isSelected && 'ring-4 ring-primary ring-offset-1 ring-offset-background shadow-[0_12px_24px_rgba(0,0,0,0.5),0_6px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]',
                      isSelected && 'scale-[1.02]',
                      !isSelected && 'hover:shadow-[0_10px_20px_rgba(0,0,0,0.45),0_5px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                      backgroundColor: (isHovered || isSelected) 
                        ? '#1BFFFE' // Bright cyan for hover/selected
                        : '#317FA3', // Teal/blue for regular
                    }}
                  >
                    <div className="flex flex-col items-center justify-center flex-1 px-2">
                      {/* Icon or stars for difficulty */}
                      <div className="flex items-center justify-center flex-1 pb-1">
                        {preset === 'nightmare' ? (
                          <span className="text-2xl sm:text-3xl">{difficultyIcons[preset]}</span>
                        ) : (
                          <span className="text-xl sm:text-2xl leading-none">{difficultyStars[preset]}</span>
                        )}
                      </div>
                      {/* Text label */}
                      <span className="font-bold text-[10px] sm:text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center shrink-0">
                        {preset === 'easy' && t(language, 'difficulty.name.easy')}
                        {preset === 'medium' && t(language, 'difficulty.name.medium')}
                        {preset === 'hard' && t(language, 'difficulty.name.hard')}
                        {preset === 'nightmare' && t(language, 'difficulty.name.nightmare')}
                      </span>
                    </div>
                  </button>
                  
                  {/* Tooltip */}
                  {isHovered && (
                    <div 
                      className={cn(
                        'absolute z-50 w-64 sm:w-72 p-4 border-4 pixel-border',
                        'shadow-[0_0_20px_rgba(62,124,172,0.4)] text-left',
                        'bottom-full left-1/2 -translate-x-1/2 mb-2',
                        'sm:bottom-auto sm:left-full sm:top-0 sm:translate-x-2 sm:translate-y-0',
                        'animate-in fade-in slide-in-from-bottom-2 duration-200'
                      )}
                      style={{
                        borderColor: '#3E7CAC',
                        backgroundColor: '#003A63',
                      }}
                    >
                      <p className="text-sm font-semibold text-foreground">{description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SlideTransition>

      {/* Start Game Button - Slide transition */}
      <SlideTransition
        show={showStartButton}
        direction="right"
        duration={300}
        className="absolute inset-0"
      >
        <div className="flex flex-col gap-4">
          {/* Back button */}
          <button
            onClick={handleBackToDifficulty}
            disabled={disabled}
            draggable={false}
            className={cn(
              'self-start px-3 py-1.5 text-sm font-semibold border-2 pixel-border',
              'transition-all duration-200 hover:opacity-90',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
              color: '#fff',
            }}
          >
            ← {t(language, 'difficulty.select.title')}
          </button>

          {/* Quick Summary */}
          <div 
            className="p-4 border-2 pixel-border rounded-lg"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
          >
            <div className="flex flex-col gap-2 text-sm text-foreground/90">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t(language, 'mode.select.title')}:</span>
                <span className="text-primary font-bold">{getModeName(localMode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t(language, 'difficulty.select.title')}:</span>
                <span className="text-primary font-bold">
                  {localDifficulty === 'easy' && t(language, 'difficulty.name.easy')}
                  {localDifficulty === 'medium' && t(language, 'difficulty.name.medium')}
                  {localDifficulty === 'hard' && t(language, 'difficulty.name.hard')}
                  {localDifficulty === 'nightmare' && t(language, 'difficulty.name.nightmare')}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleStart}
            disabled={disabled}
            draggable={false}
            className={cn(
              'w-full min-h-[56px] px-4 py-3 text-base sm:text-lg font-bold',
              'border-4 border-primary bg-primary text-primary-foreground',
              'transition-all duration-100 hover:border-secondary hover:bg-secondary',
              'active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary',
              'pixel-border whitespace-nowrap',
              'shadow-[0_8px_16px_rgba(0,0,0,0.4)]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t(language, 'landing.startGame')} - {getModeName(localMode)}
          </button>
        </div>
      </SlideTransition>
    </div>
  );
}
