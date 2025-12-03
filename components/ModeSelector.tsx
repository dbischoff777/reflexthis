'use client';

import { useEffect } from 'react';
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-primary">
          {t(language, 'mode.select.title')}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            draggable={false}
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #000000 100%)',
              borderColor: '#1e3a5f',
            }}
            className="text-xs text-foreground/70 hover:text-foreground border-2 px-2 py-1 pixel-border transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={t(language, 'difficulty.cancel')}
          >
            {t(language, 'difficulty.esc')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const modeInfo = GAME_MODES[mode];
          const isSelected = selected === mode;

          return (
            <button
              key={mode}
              onClick={() => !disabled && onSelect(mode)}
              disabled={disabled}
              draggable={false}
              className={cn(
                'p-6 sm:p-8 border-4 transition-all duration-150 text-center pixel-border relative',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'bg-gradient-to-br from-purple-300 via-purple-200 to-blue-300',
                'border-white/80 shadow-lg',
                'h-[180px] sm:h-[200px] w-full',
                'flex flex-col items-center justify-center',
                isSelected
                  ? 'ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl shadow-primary/50'
                  : 'hover:shadow-xl',
                disabled && 'opacity-50 cursor-not-allowed',
                // Center nightmare mode on large screens when it's alone in the row
                mode === 'nightmare' && 'lg:col-start-2'
              )}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, #C084FC 0%, #A78BFA 50%, #93C5FD 100%)'
                  : 'linear-gradient(135deg, #D8B4FE 0%, #C4B5FD 50%, #A5B4FC 100%)',
              }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="text-5xl sm:text-6xl">{modeInfo.icon}</span>
                <span className="font-bold text-xl sm:text-2xl text-white drop-shadow-lg">
                  {mode === 'reflex' && t(language, 'mode.reflex.name')}
                  {mode === 'sequence' && t(language, 'mode.sequence.name')}
                  {mode === 'survival' && t(language, 'mode.survival.name')}
                  {mode === 'nightmare' && t(language, 'mode.nightmare.name')}
                  {mode === 'oddOneOut' && t(language, 'mode.odd.name')}
                </span>
                {isSelected && (
                  <span className="text-3xl text-white font-bold drop-shadow-lg" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

