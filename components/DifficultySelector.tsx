'use client';

import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { cn } from '@/lib/utils';

interface DifficultySelectorProps {
  selected: DifficultyPreset;
  onSelect: (difficulty: DifficultyPreset) => void;
  disabled?: boolean;
}

/**
 * DifficultySelector component - Allows players to choose difficulty preset
 */
export function DifficultySelector({
  selected,
  onSelect,
  disabled = false,
}: DifficultySelectorProps) {
  const difficulties: DifficultyPreset[] = ['easy', 'medium', 'hard', 'custom'];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-primary">Select Difficulty</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {difficulties.map((preset) => {
          const config = DIFFICULTY_PRESETS[preset];
          const isSelected = selected === preset;

          return (
            <button
              key={preset}
              onClick={() => !disabled && onSelect(preset)}
              disabled={disabled}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card',
                isSelected
                  ? 'border-primary bg-primary/20 shadow-glow'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-card/80',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-primary">{config.name}</span>
                {isSelected && (
                  <span className="text-xl" aria-label="Selected">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {config.description}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
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

