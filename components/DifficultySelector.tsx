'use client';

import { useEffect } from 'react';
import { DifficultyPreset, DIFFICULTY_PRESETS } from '@/lib/difficulty';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

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
  const { language } = useGameState();
  // For nightmare mode, only show nightmare difficulty
  const difficulties: DifficultyPreset[] = gameMode === 'nightmare' 
    ? ['nightmare'] 
    : ['easy', 'medium', 'hard', 'custom'];

  // Icons for each difficulty level
  const difficultyIcons: Record<DifficultyPreset, string> = {
    easy: '🌱',
    medium: '⚡',
    hard: '🔥',
    custom: '⚙️',
    nightmare: '💀',
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-primary">{t(language, 'difficulty.select.title')}</h3>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                'p-6 sm:p-8 border-4 transition-all duration-150 text-center pixel-border relative',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'bg-gradient-to-br from-purple-300 via-purple-200 to-blue-300',
                'border-white/80 shadow-lg',
                'h-[180px] sm:h-[200px] w-full',
                'flex flex-col items-center justify-center',
                isSelected
                  ? 'ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl shadow-primary/50'
                  : 'hover:shadow-xl',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, #C084FC 0%, #A78BFA 50%, #93C5FD 100%)'
                  : 'linear-gradient(135deg, #D8B4FE 0%, #C4B5FD 50%, #A5B4FC 100%)',
              }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="text-5xl sm:text-6xl">{difficultyIcons[preset]}</span>
                <span className="font-bold text-xl sm:text-2xl text-white drop-shadow-lg">
                  {preset === 'easy' && t(language, 'difficulty.name.easy')}
                  {preset === 'medium' && t(language, 'difficulty.name.medium')}
                  {preset === 'hard' && t(language, 'difficulty.name.hard')}
                  {preset === 'custom' && t(language, 'difficulty.name.custom')}
                  {preset === 'nightmare' && t(language, 'difficulty.name.nightmare')}
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

