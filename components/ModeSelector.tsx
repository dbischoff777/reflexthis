'use client';

import { useEffect, useState } from 'react';
import { GameMode, GAME_MODES } from '@/lib/gameModes';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

interface ModeSelectorProps {
  selected: GameMode;
  onSelect: (mode: GameMode) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/**
 * ModeSelector component - Allows players to choose game mode
 */
export function ModeSelector({
  selected,
  onSelect,
  onCancel,
  disabled = false,
}: ModeSelectorProps) {
  const { language } = useGameState();
  const modes: GameMode[] = ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'];
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);

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

  const getModeTips = (mode: GameMode) => {
    switch (mode) {
      case 'reflex':
        return [
          { icon: '⚡', text: t(language, 'ready.tip.reflex.1') },
          { icon: '⭐', text: t(language, 'ready.tip.reflex.2') },
          { icon: '🔥', text: t(language, 'ready.tip.reflex.3') },
        ];
      case 'sequence':
        return [
          { icon: '👁️', text: t(language, 'ready.tip.sequence.1') },
          { icon: '🧠', text: t(language, 'ready.tip.sequence.2') },
          { icon: '⏱️', text: t(language, 'ready.tip.sequence.3') },
        ];
      case 'survival':
        return [
          { icon: '💀', text: t(language, 'ready.tip.survival.1') },
          { icon: '⚡', text: t(language, 'ready.tip.survival.2') },
          { icon: '⭐', text: t(language, 'ready.tip.survival.3') },
        ];
      case 'nightmare':
        return [
          { icon: '🔥', text: t(language, 'ready.tip.nightmare.1') },
          { icon: '⚡', text: t(language, 'ready.tip.nightmare.2') },
          { icon: '⏱️', text: t(language, 'ready.tip.nightmare.3') },
        ];
      case 'oddOneOut':
        return [
          { icon: '🎯', text: t(language, 'ready.tip.odd.1') },
          { icon: '❌', text: t(language, 'ready.tip.odd.2') },
          { icon: '⚡', text: t(language, 'ready.tip.odd.3') },
        ];
      default:
        return [
          { icon: '⚡', text: t(language, 'ready.tip.default.1') },
          { icon: '✓', text: t(language, 'ready.tip.default.2') },
          { icon: '🔥', text: t(language, 'ready.tip.default.3') },
        ];
    }
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

  // Helper function to get button image path
  const getButtonImage = (mode: GameMode, isHovered: boolean, isSelected: boolean) => {
    const modeName = mode === 'oddOneOut' ? 'oddoneout' : mode;
    // Use hover image when hovered OR selected (selected buttons show hover/magenta state)
    const state = (isHovered || isSelected) ? 'Hover' : 'Regular';
    return `/buttons/${modeName}${state}.png`;
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
      {/* Subtitle: "Choose Your Game" - left-aligned */}
      <h3 className="text-base sm:text-lg font-semibold text-white text-left">
        Choose Your Game
      </h3>
      
      {/* 3x2 Grid of mode buttons */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {modes.map((mode) => {
          const modeInfo = GAME_MODES[mode];
          const isSelected = selected === mode;
          const isHovered = hoveredMode === mode;
          const tips = getModeTips(mode);
          const description = getModeDescription(mode);
          const buttonImage = getButtonImage(mode, isHovered, isSelected);

          return (
            <div
              key={mode}
              className="relative"
              onMouseEnter={() => setHoveredMode(mode)}
              onMouseLeave={() => setHoveredMode(null)}
            >
              <button
                onClick={() => !disabled && onSelect(mode)}
                disabled={disabled}
                draggable={false}
                className={cn(
                  'relative w-full aspect-square rounded-lg transition-all duration-200',
                  'min-h-[100px] sm:min-h-[120px] md:min-h-[140px]',
                  'flex flex-col overflow-hidden',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isSelected
                    ? 'ring-4 ring-fuchsia-500 ring-offset-1 ring-offset-background shadow-2xl shadow-fuchsia-500/70'
                    : '',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  backgroundColor: (isHovered || isSelected) 
                    ? '#1BFFFE' // Bright cyan for hover/selected
                    : '#317FA3', // Teal/blue for regular
                }}
              >
                {/* Image container - takes up most of the button, leaving space for text */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2 pt-2 sm:px-3 sm:pt-3">
                  <img
                    src={buttonImage}
                    alt={modeInfo.name}
                    className="w-full h-full max-w-[90%] max-h-[90%] object-contain transition-opacity duration-200"
                    draggable={false}
                  />
                </div>
                {/* Label at bottom - sits between image and button edge */}
                <div className="flex items-center justify-center py-2 sm:py-2.5 md:py-3 pointer-events-none shrink-0">
                  <span className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                    {mode === 'reflex' && t(language, 'mode.reflex.name')}
                    {mode === 'sequence' && t(language, 'mode.sequence.name')}
                    {mode === 'survival' && t(language, 'mode.survival.name')}
                    {mode === 'nightmare' && t(language, 'mode.nightmare.name')}
                    {mode === 'oddOneOut' && t(language, 'mode.odd.name')}
                  </span>
                </div>
              </button>
              
              {/* Tooltip */}
              {isHovered && (
                <div 
                  className={cn(
                    'absolute z-50 w-64 sm:w-72 p-4 border-4 pixel-border',
                    'shadow-[0_0_20px_rgba(62,124,172,0.4)] text-left',
                    // Position tooltip above on mobile, to the right on desktop
                    'bottom-full left-1/2 -translate-x-1/2 mb-2',
                    'sm:bottom-auto sm:left-full sm:top-0 sm:translate-x-2 sm:translate-y-0',
                    'animate-in fade-in slide-in-from-bottom-2 duration-200'
                  )}
                  style={{
                    borderColor: '#3E7CAC',
                    backgroundColor: '#003A63',
                  }}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">{description}</p>
                    <div className="space-y-1.5">
                      {tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                          <span className="font-bold text-base leading-none">{tip.icon}</span>
                          <span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

