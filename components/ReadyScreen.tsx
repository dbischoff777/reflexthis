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
    return 'GAME';
  };

  const renderTutorialContent = () => (
    <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-3xl mx-auto text-left">
      {/* Title + Mode - compact on mobile */}
      <div className="text-center space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-primary text-glow pixel-border px-3 py-1 sm:px-4 sm:py-2 inline-block border-2 sm:border-4 border-primary">
          REFLEX THIS
        </h1>
        {gameMode && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Mode:</span>
            <span className="text-lg sm:text-2xl font-bold text-secondary pixel-border px-2 py-0.5 sm:px-3 sm:py-1 inline-block border-2 border-secondary">
              {getModeName()}
            </span>
          </div>
        )}
      </div>

      {/* 3-4-3 grid + default keys */}
      <section className="grid gap-2 sm:gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] items-start">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-sm sm:text-lg font-bold text-primary pixel-border inline-block px-2 py-0.5 sm:px-3 sm:py-1 border-2 border-primary">
            Controls
          </h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            3–4–3 grid mapped to QWERTZ keyboard:
          </p>

          <div className="inline-block rounded-md bg-card/60 border-2 sm:border-4 border-primary pixel-border px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs">
            <div className="flex flex-col items-center gap-1 sm:gap-1.5">
              <div className="flex gap-1 sm:gap-1.5">
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">Q</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">W</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">E</span>
              </div>
              <div className="flex gap-1 sm:gap-1.5">
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">A</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">S</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">D</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">F</span>
              </div>
              <div className="flex gap-1 sm:gap-1.5">
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">Y</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">X</span>
                <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 border border-border bg-background/80 font-mono">C</span>
              </div>
            </div>
            <p className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-muted-foreground">
              Change in <span className="font-semibold">Settings → Keybindings</span>
            </p>
          </div>
        </div>

        {/* What counts as "good" + mode details */}
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-sm sm:text-lg font-bold text-primary pixel-border inline-block px-2 py-0.5 sm:px-3 sm:py-1 border-2 border-primary">
            How to Play
          </h2>
          <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-muted-foreground">
            <li>
              <span className="font-semibold text-primary">Fast reactions:</span>{' '}
              hit highlighted buttons quickly.
            </li>
            <li>
              <span className="font-semibold text-primary">No misses:</span>{' '}
              wrong buttons cost lives and reset combo.
            </li>
            <li>
              <span className="font-semibold text-primary">Keep the combo:</span>{' '}
              higher combo = more points per hit.
            </li>
            <li className="hidden sm:list-item">
              <span className="font-semibold text-primary">Difficulty:</span>{' '}
              speed increases as score climbs.
            </li>
          </ul>

          {/* Mode-specific explanation - shorter */}
          {gameMode === 'reflex' && (
            <p className="text-[10px] sm:text-xs text-foreground/80">
              <span className="font-semibold text-primary">Reflex:</span>{' '}
              Hit buttons before they disappear. Build combos for bonus points.
            </p>
          )}
          {gameMode === 'sequence' && (
            <p className="text-[10px] sm:text-xs text-foreground/80">
              <span className="font-semibold text-primary">Sequence:</span>{' '}
              Watch the pattern, then repeat it exactly. Mistakes restart.
            </p>
          )}
          {gameMode === 'survival' && (
            <p className="text-[10px] sm:text-xs text-foreground/80">
              <span className="font-semibold text-primary">Survival:</span>{' '}
              One life only. Any mistake ends the run immediately.
            </p>
          )}
          {gameMode === 'nightmare' && (
            <p className="text-[10px] sm:text-xs text-foreground/80">
              <span className="font-semibold text-primary">Nightmare:</span>{' '}
              Extreme speed, up to 6 buttons. For elite players only.
            </p>
          )}
        </div>
      </section>

      {/* Footer / hint - hidden on very small screens */}
      <p className="text-[9px] sm:text-[10px] text-center text-foreground/60 font-mono hidden sm:block">
        Tip: Open settings in-game (gear icon) to adjust keybindings.
      </p>
    </div>
  );


  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center crt-scanlines overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
        <div className="relative z-10 w-full max-w-4xl">
          {renderTutorialContent()}

          <div className="mt-2 sm:mt-4 flex justify-center">
            <button
              onClick={handleStart}
              draggable={false}
              className={cn(
                'px-6 py-2 sm:px-8 sm:py-3 text-lg sm:text-xl font-bold',
                'border-2 sm:border-4 border-primary bg-primary text-primary-foreground',
                'hover:border-secondary hover:bg-secondary',
                'transition-all duration-100 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'pixel-border',
                'animate-pixel-pulse'
              )}
              style={{
                imageRendering: 'pixelated' as any,
              }}
            >
              START
            </button>
          </div>
        </div>

        {/* Animated border effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 border-4 sm:border-8 border-primary opacity-20"
            style={{
              animation: 'pixel-pulse 2s infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}


