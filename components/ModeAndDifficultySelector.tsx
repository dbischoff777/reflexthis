'use client';

import { useEffect, useState, useMemo } from 'react';
import { GameMode, GAME_MODES } from '@/lib/gameModes';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

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
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>(selectedDifficulty);

  // Sync local difficulty with props when they change
  useEffect(() => {
    setLocalDifficulty(selectedDifficulty);
  }, [selectedDifficulty]);

  // Handle mode selection - start immediately with selected difficulty
  const handleModeSelect = (mode: GameMode) => {
    if (!disabled) {
      // If nightmare difficulty is selected, only allow nightmare mode
      if (localDifficulty === 'nightmare' && mode !== 'nightmare') {
        // Don't allow starting non-nightmare modes with nightmare difficulty
        return;
      }
      // Auto-select nightmare difficulty if nightmare mode
      const difficultyToUse = mode === 'nightmare' ? 'nightmare' : localDifficulty;
      // Start game immediately
      onStart(mode, difficultyToUse);
    }
  };

  // Handle difficulty selector button click - cycle through available difficulties
  const handleDifficultyCycle = () => {
    if (!disabled) {
      // Include nightmare in the cycle, but make it visually clear it's only for Nightmare mode
      const availableDifficulties: DifficultyPreset[] = ['easy', 'medium', 'hard', 'nightmare'];
      const currentIndex = availableDifficulties.indexOf(localDifficulty);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % availableDifficulties.length;
      setLocalDifficulty(availableDifficulties[nextIndex]);
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

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

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

  const getDifficultyDescription = (preset: DifficultyPreset) => {
    switch (preset) {
      case 'easy': return t(language, 'difficulty.desc.easy');
      case 'medium': return t(language, 'difficulty.desc.medium');
      case 'hard': return t(language, 'difficulty.desc.hard');
      case 'nightmare': return t(language, 'difficulty.desc.nightmare');
      default: return '';
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
      {/* Subtitle: "Choose Your Game" - left-aligned */}
      <h3 className="text-base sm:text-lg font-semibold text-white text-left">
        Choose Your Game
      </h3>
      
      {/* 3x2 Grid of mode buttons + difficulty selector */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {modes.map((mode) => {
          const modeInfo = GAME_MODES[mode];
          const isHovered = hoveredMode === mode;
          const buttonImage = getButtonImage(mode, isHovered, false);
          const bestScore = getBestScoreForMode(mode);
          // Disable non-nightmare modes when nightmare difficulty is selected
          const isDisabledByDifficulty = localDifficulty === 'nightmare' && mode !== 'nightmare';
          const isButtonDisabled = disabled || isDisabledByDifficulty;

          return (
            <div
              key={mode}
              className="relative"
              onMouseEnter={() => setHoveredMode(mode)}
              onMouseLeave={() => setHoveredMode(null)}
            >
              <button
                onClick={() => handleModeSelect(mode)}
                disabled={isButtonDisabled}
                draggable={false}
                className={cn(
                  'relative w-full aspect-square rounded-2xl transition-all duration-200',
                  'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                  'flex flex-col overflow-hidden',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  // 3D effect with shadows
                  'shadow-[0_8px_16px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
                  !isButtonDisabled && 'hover:shadow-[0_10px_20px_rgba(0,0,0,0.45),0_5px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
                  isButtonDisabled && 'opacity-40 cursor-not-allowed',
                  isDisabledByDifficulty && 'grayscale'
                )}
                style={{
                  backgroundColor: isHovered && !isButtonDisabled
                    ? '#1BFFFE' // Bright cyan for hover
                    : '#317FA3', // Teal/blue for regular
                }}
              >
                {/* Overlay for disabled state when nightmare difficulty is selected */}
                {isDisabledByDifficulty && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-xs font-bold text-red-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center px-2">
                      {t(language, 'mode.nightmare.name')} Only
                    </span>
                  </div>
                )}
                {/* Image container - larger icons */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2 pt-2 sm:px-3 sm:pt-3">
                  <img
                    src={buttonImage}
                    alt={modeInfo.name}
                    className={cn(
                      "w-full h-full max-w-[95%] max-h-[95%] object-contain transition-opacity duration-200",
                      isDisabledByDifficulty && "opacity-50"
                    )}
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
              
              {/* Tooltip explaining why mode is disabled */}
              {isHovered && isDisabledByDifficulty && (
                <div 
                  className={cn(
                    'absolute z-50 w-64 sm:w-72 p-4 border-4 pixel-border',
                    'shadow-[0_0_20px_rgba(220,38,38,0.4)] text-left',
                    'bottom-full left-1/2 -translate-x-1/2 mb-2',
                    'sm:bottom-auto sm:left-full sm:top-0 sm:translate-x-2 sm:translate-y-0',
                    'animate-in fade-in slide-in-from-bottom-2 duration-200'
                  )}
                  style={{
                    borderColor: '#DC2626',
                    backgroundColor: '#1F0000',
                  }}
                >
                  <p className="text-sm font-semibold text-red-300 mb-2">
                    ⚠️ {t(language, 'mode.nightmare.name')} Difficulty Selected
                  </p>
                  <p className="text-xs text-foreground/90">
                    {t(language, 'mode.nightmare.name')} difficulty can only be used with {t(language, 'mode.nightmare.name')} mode. Please select {t(language, 'mode.nightmare.name')} mode or change the difficulty.
                  </p>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Difficulty Selector Button - Replaces Quick Start */}
        <div
          className="relative"
          onMouseEnter={() => setHoveredDifficulty(localDifficulty)}
          onMouseLeave={() => setHoveredDifficulty(null)}
        >
          <button
            onClick={handleDifficultyCycle}
            disabled={disabled}
            draggable={false}
            className={cn(
              'relative w-full aspect-square rounded-2xl transition-all duration-200',
              'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
              'flex flex-col items-center justify-center overflow-hidden',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              // 3D effect with shadows - matching mode buttons
              'shadow-[0_8px_16px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
              'hover:shadow-[0_10px_20px_rgba(0,0,0,0.45),0_5px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
              'hover:scale-[1.02]',
              // Special styling for nightmare difficulty - make it visually distinct
              localDifficulty === 'nightmare' && 'ring-2 ring-red-500 ring-offset-1',
              localDifficulty === 'nightmare' && 'border-2 border-red-500/60',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              backgroundColor: hoveredDifficulty === localDifficulty
                ? localDifficulty === 'nightmare' 
                  ? '#8B0000' // Dark red for nightmare hover
                  : '#A855F7' // Bright purple for hover (different from game mode buttons)
                : localDifficulty === 'nightmare'
                  ? '#4A0000' // Very dark red for nightmare regular
                  : '#7C3AED', // Purple for regular (different from game mode buttons)
            }}
          >
            <div className="flex flex-col items-center justify-center flex-1 px-2">
              {/* Icon or stars for difficulty */}
              <div className="flex items-center justify-center flex-1 pb-1">
                {localDifficulty === 'nightmare' ? (
                  <span className="text-4xl sm:text-5xl">{difficultyIcons[localDifficulty]}</span>
                ) : (
                  <span className="text-3xl sm:text-4xl leading-none">{difficultyStars[localDifficulty]}</span>
                )}
              </div>
              {/* Text label */}
              <span className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] text-center shrink-0">
                {localDifficulty === 'easy' && t(language, 'difficulty.name.easy')}
                {localDifficulty === 'medium' && t(language, 'difficulty.name.medium')}
                {localDifficulty === 'hard' && t(language, 'difficulty.name.hard')}
                {localDifficulty === 'nightmare' && t(language, 'difficulty.name.nightmare')}
              </span>
              <span className={cn(
                "text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-1 text-center",
                localDifficulty === 'nightmare' 
                  ? "text-red-300 font-semibold" 
                  : "text-white/80"
              )}>
                {localDifficulty === 'nightmare' 
                  ? t(language, 'mode.nightmare.name') + ' ' + t(language, 'difficulty.only')
                  : t(language, 'difficulty.select.title')
                }
              </span>
            </div>
          </button>
          
          {/* Tooltip */}
          {hoveredDifficulty === localDifficulty && (
            <div 
              className={cn(
                'absolute z-50 w-64 sm:w-72 p-4 border-4 pixel-border',
                'shadow-[0_0_20px_rgba(62,124,172,0.4)] text-left',
                'bottom-full left-1/2 -translate-x-1/2 mb-2',
                'sm:bottom-auto sm:left-full sm:top-0 sm:translate-x-2 sm:translate-y-0',
                'animate-in fade-in slide-in-from-bottom-2 duration-200'
              )}
              style={{
                borderColor: localDifficulty === 'nightmare' ? '#DC2626' : '#3E7CAC',
                backgroundColor: localDifficulty === 'nightmare' ? '#1F0000' : '#003A63',
              }}
            >
              <p className="text-sm font-semibold text-foreground mb-2">{getDifficultyDescription(localDifficulty)}</p>
              {localDifficulty === 'nightmare' ? (
                <p className="text-xs text-red-300 font-semibold mb-1">
                  ⚠️ {t(language, 'mode.nightmare.name')} {t(language, 'difficulty.only')}
                </p>
              ) : null}
              <p className="text-xs text-foreground/80">{t(language, 'difficulty.cycle.hint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
