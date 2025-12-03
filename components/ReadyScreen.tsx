'use client';

import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

interface ReadyScreenProps {
  onReady: () => void;
  gameMode?: string;
}

/**
 * ReadyScreen component
 * - Always shows tutorial content (controls + how to play well)
 */
export function ReadyScreen({ onReady, gameMode }: ReadyScreenProps) {
  const { language } = useGameState();
  const handleStart = () => {
    onReady();
  };

  const getModeName = () => {
    if (gameMode === 'reflex') return t(language, 'mode.reflex.name').toUpperCase();
    if (gameMode === 'sequence') return t(language, 'mode.sequence.name').toUpperCase();
    if (gameMode === 'survival') return t(language, 'mode.survival.name').toUpperCase();
    if (gameMode === 'nightmare') return t(language, 'mode.nightmare.name').toUpperCase();
    if (gameMode === 'oddOneOut') return t(language, 'mode.odd.name').toUpperCase();
    return 'GAME';
  };

  const getModeDescription = () => {
    switch (gameMode) {
      case 'reflex': return t(language, 'ready.reflex.desc');
      case 'sequence': return t(language, 'ready.sequence.desc');
      case 'survival': return t(language, 'ready.survival.desc');
      case 'nightmare': return t(language, 'ready.nightmare.desc');
      case 'oddOneOut': return t(language, 'ready.odd.desc');
      default: return t(language, 'ready.default.desc');
    }
  };

  const getModeTips = () => {
    switch (gameMode) {
      case 'reflex':
        return [
          { icon: '⚡', text: t(language, 'ready.tip.reflex.1'), color: 'border-primary/50' },
          { icon: '⭐', text: t(language, 'ready.tip.reflex.2'), color: 'border-yellow-500/50' },
          { icon: '🔥', text: t(language, 'ready.tip.reflex.3'), color: 'border-secondary/50' },
        ];
      case 'sequence':
        return [
          { icon: '👁️', text: t(language, 'ready.tip.sequence.1'), color: 'border-primary/50' },
          { icon: '🧠', text: t(language, 'ready.tip.sequence.2'), color: 'border-chart-3/50' },
          { icon: '⏱️', text: t(language, 'ready.tip.sequence.3'), color: 'border-secondary/50' },
        ];
      case 'survival':
        return [
          { icon: '💀', text: t(language, 'ready.tip.survival.1'), color: 'border-destructive/50' },
          { icon: '⚡', text: t(language, 'ready.tip.survival.2'), color: 'border-primary/50' },
          { icon: '⭐', text: t(language, 'ready.tip.survival.3'), color: 'border-yellow-500/50' },
        ];
      case 'nightmare':
        return [
          { icon: '🔥', text: t(language, 'ready.tip.nightmare.1'), color: 'border-destructive/50' },
          { icon: '⚡', text: t(language, 'ready.tip.nightmare.2'), color: 'border-primary/50' },
          { icon: '⏱️', text: t(language, 'ready.tip.nightmare.3'), color: 'border-secondary/50' },
        ];
      case 'oddOneOut':
        return [
          { icon: '🎯', text: t(language, 'ready.tip.odd.1'), color: 'border-secondary/50' },
          { icon: '❌', text: t(language, 'ready.tip.odd.2'), color: 'border-primary/50' },
          { icon: '⚡', text: t(language, 'ready.tip.odd.3'), color: 'border-chart-3/50' },
        ];
      default:
        return [
          { icon: '⚡', text: t(language, 'ready.tip.default.1'), color: 'border-primary/50' },
          { icon: '✓', text: t(language, 'ready.tip.default.2'), color: 'border-chart-3/50' },
          { icon: '🔥', text: t(language, 'ready.tip.default.3'), color: 'border-secondary/50' },
        ];
    }
  };

  const renderTutorialContent = () => {
    const tips = getModeTips();
    
    return (
      <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto text-center">
        {/* Title + Mode */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary text-glow">
            {getModeName()}
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground">
            {getModeDescription()}
          </p>
        </div>

        {/* Mode-specific tips - concise and essential */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-base sm:text-lg">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 bg-card/60 border-2 rounded',
                tip.color
              )}
            >
              <span className="font-bold">{tip.icon}</span>
              <span>{tip.text}</span>
            </div>
          ))}
        </div>

        {/* Keyboard layout - compact */}
        <div className="inline-block bg-card/40 border-2 border-border rounded-xl px-6 py-5">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">Q</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">W</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">E</kbd>
            </div>
            <div className="flex gap-2">
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">A</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">S</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">D</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">F</kbd>
            </div>
            <div className="flex gap-2">
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">Y</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">X</kbd>
              <kbd className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-border bg-background/80 text-base sm:text-lg font-semibold rounded-md">C</kbd>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t(language, 'ready.customize')}
          </p>
        </div>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-8 py-4 sm:py-8 overflow-hidden">
        <div className="relative z-10 w-full max-w-3xl">
          {renderTutorialContent()}

          <div className="mt-8 sm:mt-10 flex justify-center">
            <button
              onClick={handleStart}
              draggable={false}
              className={cn(
                'px-12 py-4 sm:px-20 sm:py-5 text-2xl sm:text-3xl font-bold tracking-wide',
                'border-4 border-primary bg-primary text-primary-foreground',
                'hover:border-secondary hover:bg-secondary',
                'transition-all duration-150 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                'rounded-lg shadow-lg shadow-primary/30',
                'animate-pulse'
              )}
            >
              {t(language, 'ready.start')}
            </button>
          </div>
        </div>

        {/* Subtle animated border */}
        <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-primary/20 rounded-xl" />
      </div>
    </div>
  );
}


