'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ReadyScreenProps {
  onReady: () => void;
  gameMode?: string;
}

const READY_STORAGE_KEY = 'reflexthis_seen_tutorial';

/**
 * ReadyScreen component
 * - First time: shows a one-page tutorial (controls + how to play well)
 * - Later: shows a compact READY screen
 */
export function ReadyScreen({ onReady, gameMode }: ReadyScreenProps) {
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasSeenTutorial(true);
      return;
    }
    const stored = window.localStorage.getItem(READY_STORAGE_KEY);
    setHasSeenTutorial(stored === 'true');
  }, []);

  const handleStart = () => {
    if (typeof window !== 'undefined' && !hasSeenTutorial) {
      window.localStorage.setItem(READY_STORAGE_KEY, 'true');
    }
    onReady();
  };

  const getModeName = () => {
    if (gameMode === 'reflex') return 'REFLEX';
    if (gameMode === 'sequence') return 'SEQUENCE';
    if (gameMode === 'survival') return 'SURVIVAL';
    return 'GAME';
  };

  const renderTutorialContent = () => (
    <div className="space-y-8 max-w-3xl mx-auto text-left">
      {/* Title + Mode */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary text-glow pixel-border px-4 py-2 inline-block border-4 border-primary">
          REFLEX THIS
        </h1>
        {gameMode && (
          <div className="space-y-1">
            <p className="text-sm sm:text-base text-muted-foreground">You are about to play:</p>
            <p className="text-2xl sm:text-3xl font-bold text-accent pixel-border px-4 py-2 inline-block border-4 border-accent">
              {getModeName()}
            </p>
          </div>
        )}
      </div>

      {/* 3-4-3 grid + default keys */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] items-start">
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-primary pixel-border inline-block px-3 py-1 border-2 border-primary">
            Controls – Default Layout
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The buttons are laid out in a 3–4–3 grid. By default they are mapped to a QWERTZ-friendly keyboard:
          </p>

          <div className="inline-block rounded-md bg-card/60 border-4 border-primary pixel-border px-4 py-3 text-xs sm:text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">Q</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">W</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">E</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">A</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">S</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">D</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">F</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">Y</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">X</span>
                <span className="px-2 py-1 border border-border bg-background/80 font-mono">C</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              You can change these later in <span className="font-semibold">Settings → Keybindings</span>.
            </p>
          </div>
        </div>

        {/* What counts as “good” + mode details */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-primary pixel-border inline-block px-3 py-1 border-2 border-primary">
            How to Play Well
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-primary">Fast reactions:</span>{' '}
              hit highlighted buttons <span className="font-mono">as quickly as you can</span> after they appear.
            </li>
            <li>
              <span className="font-semibold text-primary">No misses:</span>{' '}
              pressing the wrong button or letting highlights time out will cost you lives and reset your combo.
            </li>
            <li>
              <span className="font-semibold text-primary">Keep the combo:</span>{' '}
              each correct hit increases your combo meter; higher combo = more points per hit.
            </li>
            <li>
              <span className="font-semibold text-primary">Survival mode:</span>{' '}
              you only get <span className="font-mono">1 life</span> – a single mistake ends the run.
            </li>
            <li>
              <span className="font-semibold text-primary">Difficulty:</span>{' '}
              as your score climbs, highlights get faster and more buttons appear at once.
            </li>
          </ul>

          {/* Mode-specific explanation */}
          {gameMode === 'reflex' && (
            <p className="text-xs sm:text-sm text-foreground/80">
              <span className="font-semibold text-primary">Reflex mode:</span>{' '}
              hit highlighted buttons before they disappear. Wrong keys or timeouts cost lives and reset your combo. A higher combo means more points per hit.
            </p>
          )}
          {gameMode === 'sequence' && (
            <p className="text-xs sm:text-sm text-foreground/80">
              <span className="font-semibold text-primary">Sequence mode:</span>{' '}
              first watch the pattern, then repeat it exactly. A mistake loses a life and restarts the sequence; each success makes the sequence longer.
            </p>
          )}
          {gameMode === 'survival' && (
            <p className="text-xs sm:text-sm text-foreground/80">
              <span className="font-semibold text-primary">Survival mode:</span>{' '}
              you only have a single life. Every mistake ends the run and difficulty ramps up quickly with faster highlights and more buttons on screen.
            </p>
          )}
        </div>
      </section>

      {/* Footer / hint */}
      <p className="text-[11px] sm:text-xs text-center text-foreground/70 font-mono">
        Tip: You can open settings in-game from the HUD (gear icon) to adjust audio and keybindings.
      </p>
    </div>
  );

  const renderReadyOnlyContent = () => (
    <div className="text-center space-y-8">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary text-glow pixel-border px-4 py-2 inline-block border-4 border-primary">
        REFLEX THIS
      </h1>

      {gameMode && (
        <div className="space-y-2">
          <p className="text-lg sm:text-xl text-muted-foreground">Mode:</p>
          <p className="text-2xl sm:text-3xl font-bold text-accent pixel-border px-4 py-2 inline-block border-4 border-accent">
            {getModeName()}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <p className="text-xl sm:text-2xl font-bold text-primary pixel-border px-3 py-1 inline-block border-2 border-primary">
          READY?
        </p>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Hit the highlighted buttons as fast as you can. Keep your combo alive, avoid mistakes, and chase a new high score.
        </p>
      </div>
    </div>
  );

  // While we don't yet know if the tutorial was seen, show a simple loading state
  if (hasSeenTutorial === null) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center crt-scanlines">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary text-glow">
            REFLEX THIS
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Initializing tutorial...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center crt-scanlines">
      <div className="relative w-full h-full flex items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-5xl">
          {hasSeenTutorial ? renderReadyOnlyContent() : renderTutorialContent()}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStart}
              draggable={false}
              className={cn(
                'px-8 py-4 text-xl sm:text-2xl font-bold',
                'border-4 border-primary bg-primary text-primary-foreground',
                'hover:border-accent hover:bg-accent',
                'transition-all duration-100 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'pixel-border',
                'animate-pixel-pulse'
              )}
              style={{
                imageRendering: 'pixelated' as any,
              }}
            >
              {hasSeenTutorial ? 'START' : "GOT IT – LET'S PLAY"}
            </button>
          </div>
        </div>

        {/* Animated border effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 border-8 border-primary opacity-20"
            style={{
              animation: 'pixel-pulse 2s infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}


