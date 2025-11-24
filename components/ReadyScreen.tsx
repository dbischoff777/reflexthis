'use client';

import { cn } from '@/lib/utils';

interface ReadyScreenProps {
  onReady: () => void;
  gameMode?: string;
}

/**
 * ReadyScreen component - Shows a ready button before game starts
 * Allows players to prepare before the game begins
 */
export function ReadyScreen({ onReady, gameMode }: ReadyScreenProps) {
  const getModeName = () => {
    if (gameMode === 'reflex') return 'REFLEX';
    if (gameMode === 'sequence') return 'SEQUENCE';
    if (gameMode === 'survival') return 'SURVIVAL';
    return 'GAME';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center crt-scanlines">
      <div className="text-center space-y-8">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary text-glow pixel-border px-4 py-2 inline-block border-4 border-primary">
          REFLEX THIS
        </h1>
        
        {/* Mode indicator */}
        {gameMode && (
          <div className="space-y-2">
            <p className="text-lg sm:text-xl text-muted-foreground">Mode:</p>
            <p className="text-2xl sm:text-3xl font-bold text-accent pixel-border px-4 py-2 inline-block border-4 border-accent">
              {getModeName()}
            </p>
          </div>
        )}
        
        {/* Ready message */}
        <div className="space-y-6">
          <p className="text-xl sm:text-2xl font-bold text-primary pixel-border px-3 py-1 inline-block border-2 border-primary">
            READY?
          </p>
          
          {/* Ready button */}
          <button
            onClick={onReady}
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
            START
          </button>
          
          <p className="text-sm text-muted-foreground font-mono">
            Press START when ready
          </p>
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

