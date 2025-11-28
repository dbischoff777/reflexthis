'use client';

import { useEffect } from 'react';
import { GameMode, GAME_MODES } from '@/lib/gameModes';
import { cn } from '@/lib/utils';

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
  const modes: GameMode[] = ['reflex', 'sequence', 'survival'];

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
        <h3 className="text-lg font-semibold text-primary">Select Game Mode</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            draggable={false}
            className="text-xs text-muted-foreground hover:text-foreground border-2 border-border bg-card px-2 py-1 pixel-border transition-all duration-100 hover:border-primary"
            aria-label="Cancel (ESC)"
          >
            ESC
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
                'p-4 border-4 transition-all duration-100 text-left pixel-border',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                isSelected
                  ? 'border-primary bg-primary/30'
                  : 'border-border bg-card hover:border-primary hover:bg-primary/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{modeInfo.icon}</span>
                  <span className="font-bold text-lg text-primary">{modeInfo.name}</span>
                </div>
                {isSelected && (
                  <span className="text-xl" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-tight text-center">
                {mode === 'reflex' && 'Hit fast'}
                {mode === 'sequence' && 'Repeat pattern'}
                {mode === 'survival' && 'One life only'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

