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
            className="text-xs text-muted-foreground hover:text-foreground border-2 border-border bg-card px-2 py-1 pixel-border transition-all duration-100 hover:border-primary"
            aria-label={t(language, 'difficulty.cancel')}
          >
            {t(language, 'difficulty.esc')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                'p-4 border-4 transition-all duration-150 text-left pixel-border relative',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                isSelected
                  ? 'border-primary bg-linear-to-r from-primary/40 via-primary/60 to-secondary/40 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                disabled && 'opacity-50 cursor-not-allowed',
                // Center nightmare mode on large screens when it's alone in the row
                mode === 'nightmare' && 'lg:col-start-2'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{modeInfo.icon}</span>
                  <span
                    className={cn(
                      'font-bold text-lg',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {mode === 'reflex' && t(language, 'mode.reflex.name')}
                    {mode === 'sequence' && t(language, 'mode.sequence.name')}
                    {mode === 'survival' && t(language, 'mode.survival.name')}
                    {mode === 'nightmare' && t(language, 'mode.nightmare.name')}
                    {mode === 'oddOneOut' && t(language, 'mode.odd.name')}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-xl text-primary font-bold" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-tight text-center">
                {mode === 'reflex' && t(language, 'mode.reflex.short')}
                {mode === 'sequence' && t(language, 'mode.sequence.short')}
                {mode === 'survival' && t(language, 'mode.survival.short')}
                {mode === 'nightmare' && t(language, 'mode.nightmare.short')}
                {mode === 'oddOneOut' && t(language, 'mode.odd.short')}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

