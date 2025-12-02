'use client';

import { cn } from '@/lib/utils';

interface ReadyScreenProps {
  onReady: () => void;
  gameMode?: string;
}

/**
 * ReadyScreen component
 * - Always shows tutorial content (controls + how to play well)
 */
export function ReadyScreen({ onReady, gameMode }: ReadyScreenProps) {
  const handleStart = () => {
    onReady();
  };

  const getModeName = () => {
    if (gameMode === 'reflex') return 'REFLEX';
    if (gameMode === 'sequence') return 'SEQUENCE';
    if (gameMode === 'survival') return 'SURVIVAL';
    if (gameMode === 'nightmare') return 'NIGHTMARE';
    if (gameMode === 'oddOneOut') return 'ODD ONE OUT';
    return 'GAME';
  };

  const getModeDescription = () => {
    switch (gameMode) {
      case 'reflex': return 'Hit glowing buttons fast!';
      case 'sequence': return 'Watch, then repeat the pattern';
      case 'survival': return 'One life - no mistakes!';
      case 'nightmare': return 'Extreme speed challenge';
      case 'oddOneOut': return 'Find and hit the one target that stands out.';
      default: return 'Test your reflexes!';
    }
  };

  const renderTutorialContent = () => (
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

      {/* Key points - ultra concise */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-5 text-lg sm:text-xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 border-2 border-primary/50 rounded">
          <span className="text-primary font-bold">⚡</span>
          <span>Be fast</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 border-2 border-chart-3/50 rounded">
          <span className="text-chart-3 font-bold">✓</span>
          <span>Stay accurate</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 border-2 border-secondary/50 rounded">
          <span className="text-secondary font-bold">🔥</span>
          <span>Build combos</span>
        </div>
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
          Customize in Settings
        </p>
      </div>
    </div>
  );


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
              START GAME
            </button>
          </div>
        </div>

        {/* Subtle animated border */}
        <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-primary/20 rounded-xl" />
      </div>
    </div>
  );
}


