'use client';

import { useEffect } from 'react';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { cn } from '@/lib/utils';

interface DifficultySelectorProps {
  selected: DifficultyPreset;
  onSelect: (difficulty: DifficultyPreset) => void;
  onCancel?: () => void;
  disabled?: boolean;
  gameMode?: string;
}

/**
 * DifficultySelector component - Allows players to choose difficulty preset
 */
export function DifficultySelector({
  selected,
  onSelect,
  onCancel,
  disabled = false,
  gameMode,
}: DifficultySelectorProps) {
  // For nightmare mode, only show nightmare difficulty
  const difficulties: DifficultyPreset[] = gameMode === 'nightmare' 
    ? ['nightmare'] 
    : ['easy', 'medium', 'hard', 'custom'];

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
        <h3 className="text-lg font-semibold text-primary">Select Difficulty</h3>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {difficulties.map((preset) => {
          const config = DIFFICULTY_PRESETS[preset];
          const isSelected = selected === preset;

          return (
            <button
              key={preset}
              onClick={() => !disabled && onSelect(preset)}
              disabled={disabled}
              draggable={false}
              className={cn(
                'p-4 border-4 transition-all duration-150 text-left pixel-border relative',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                isSelected
                  ? 'border-primary bg-linear-to-r from-primary/40 via-primary/60 to-secondary/40 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'font-bold text-lg',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>{config.name}</span>
                {isSelected && (
                  <span className="text-xl text-primary font-bold" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground break-words">
                {config.description}
              </p>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Base: {config.baseDuration}ms</div>
                <div>Min: {config.minDuration}ms</div>
                <div>Max Buttons: {config.maxButtons}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

