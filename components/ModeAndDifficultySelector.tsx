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
  const [localMode, setLocalMode] = useState<GameMode>(selectedMode);
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>(selectedDifficulty);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalMode(selectedMode);
    setLocalDifficulty(selectedDifficulty);
  }, [selectedMode, selectedDifficulty]);

  // Auto-select nightmare difficulty when nightmare mode is chosen
  useEffect(() => {
    if (localMode === 'nightmare') {
      setLocalDifficulty('nightmare');
    } else if (localDifficulty === 'nightmare') {
      // If switching away from nightmare mode, reset to medium
      setLocalDifficulty('medium');
    }
  }, [localMode, localDifficulty]);

  // Get available difficulties based on selected mode
  const difficulties: DifficultyPreset[] = localMode === 'nightmare' 
    ? ['nightmare'] 
    : ['easy', 'medium', 'hard', 'custom'];

  // Get recently played mode
  const recentlyPlayedMode = useMemo(() => {
    if (sessionStatistics.recentGames.length > 0) {
      return sessionStatistics.recentGames[0].gameMode;
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
      case 'custom': return t(language, 'difficulty.desc.custom');
      case 'nightmare': return t(language, 'difficulty.desc.nightmare');
      default: return '';
    }
  };

  // Icons and stars for each difficulty level
  const difficultyIcons: Record<DifficultyPreset, string> = {
    easy: '🌱',
    medium: '⚡',
    hard: '🔥',
    custom: '⚙️',
    nightmare: '💀',
  };

  const difficultyStars: Record<DifficultyPreset, string> = {
    easy: t(language, 'difficulty.stars.easy'),
    medium: t(language, 'difficulty.stars.medium'),
    hard: t(language, 'difficulty.stars.hard'),
    custom: t(language, 'difficulty.stars.custom'),
    nightmare: t(language, 'difficulty.stars.nightmare'),
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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-white text-left">
          {t(language, 'landing.chooseGame')}
        </h3>
      </div>

      {/* Mode Selection Grid */}
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
                  onClick={() => !disabled && setLocalMode(mode)}
                  disabled={disabled}
                  draggable={false}
                  className={cn(
                    'relative w-full aspect-square rounded-lg transition-all duration-200',
                    'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                    'flex flex-col overflow-hidden',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isSelected && 'ring-4 ring-fuchsia-500 ring-offset-1 ring-offset-background shadow-2xl shadow-fuchsia-500/70',
                    isSelected && 'animate-pulse',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{
                    backgroundColor: (isHovered || isSelected) 
                      ? '#1BFFFE' // Bright cyan for hover/selected
                      : '#317FA3', // Teal/blue for regular
                  }}
                >
                  {/* Recently Played Badge */}
                  {isRecentlyPlayed && (
                    <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-fuchsia-500/90 text-white text-[10px] font-bold rounded border border-fuchsia-300">
                      {t(language, 'mode.recentlyPlayed')}
                    </div>
                  )}

                  {/* Recommended Badge */}
                  {isRecommended && !isRecentlyPlayed && (
                    <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-primary/90 text-primary-foreground text-[10px] font-bold rounded border border-primary/50">
                      {t(language, 'mode.recommended')}
                    </div>
                  )}

                  {/* Image container */}
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2 pt-2 sm:px-3 sm:pt-3">
                    <img
                      src={buttonImage}
                      alt={modeInfo.name}
                      className="w-full h-full max-w-[90%] max-h-[90%] object-contain transition-opacity duration-200"
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
          
          {/* Statistics Button - Uses the empty spot in row 2 */}
          {localMode && onShowStats && (
            <button
              onClick={() => onShowStats(localMode)}
              disabled={disabled}
              draggable={false}
              className={cn(
                'relative w-full aspect-square rounded-lg transition-all duration-200',
                'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                'flex flex-col items-center justify-center overflow-hidden',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'border-4 pixel-border',
                'hover:ring-2 hover:ring-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
            >
              <div className="flex flex-col items-center justify-center gap-2 px-2">
                <span className="text-3xl sm:text-4xl">📊</span>
                <span className="font-bold text-xs sm:text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center">
                  {t(language, 'landing.viewStats')} - {getModeName(localMode)}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Difficulty Selection Grid - Only show if mode is selected */}
      {localMode && (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-white/80 text-left">
            {t(language, 'difficulty.select.title')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    onClick={() => !disabled && setLocalDifficulty(preset)}
                    disabled={disabled}
                    draggable={false}
                    className={cn(
                      'relative w-full aspect-square rounded-lg transition-all duration-200',
                      'min-h-[70px] sm:min-h-[80px]',
                      'flex flex-col items-center justify-center overflow-hidden',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      'pt-2 pb-2',
                      isSelected && 'ring-4 ring-fuchsia-500 ring-offset-1 ring-offset-background shadow-2xl shadow-fuchsia-500/70',
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
                        {preset === 'custom' || preset === 'nightmare' ? (
                          <span className="text-2xl sm:text-3xl">{difficultyIcons[preset]}</span>
                        ) : (
                          <span className="text-xl sm:text-2xl leading-none">{difficultyStars[preset]}</span>
                        )}
                      </div>
                      {/* Text label */}
                      <span className="font-bold text-[10px] sm:text-xs text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center shrink-0">
                        {preset === 'easy' && t(language, 'difficulty.name.easy')}
                        {preset === 'medium' && t(language, 'difficulty.name.medium')}
                        {preset === 'hard' && t(language, 'difficulty.name.hard')}
                        {preset === 'custom' && t(language, 'difficulty.name.custom')}
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
      )}

      {/* Start Game Button with Mode Summary */}
      {localMode && localDifficulty && (
        <div className="flex flex-col gap-2">
          {/* Quick Summary */}
          <div 
            className="p-3 border-2 pixel-border rounded-lg"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
          >
            <div className="flex flex-col gap-1 text-xs text-foreground/90">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t(language, 'mode.select.title')}:</span>
                <span className="text-primary">{getModeName(localMode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t(language, 'difficulty.select.title')}:</span>
                <span className="text-primary">
                  {localDifficulty === 'easy' && t(language, 'difficulty.name.easy')}
                  {localDifficulty === 'medium' && t(language, 'difficulty.name.medium')}
                  {localDifficulty === 'hard' && t(language, 'difficulty.name.hard')}
                  {localDifficulty === 'custom' && t(language, 'difficulty.name.custom')}
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
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t(language, 'landing.startGame')} - {getModeName(localMode)}
          </button>
        </div>
      )}
    </div>
  );
}
