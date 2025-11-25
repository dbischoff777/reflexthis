'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

import { ReactionTimeStats } from '@/lib/GameContext';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  bestCombo: number;
  reactionTimeStats: ReactionTimeStats;
  onRestart: () => void;
}

/**
 * GameOverModal component - Displays game over screen with score and restart options
 */
export function GameOverModal({
  score,
  highScore,
  isNewHighScore,
  bestCombo,
  reactionTimeStats,
  onRestart,
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 crt-scanlines">
      <div
        className={cn(
          'relative w-full max-w-md border-4 p-6 sm:p-8',
          'bg-card border-primary pixel-border',
          'animate-[fadeIn_0.3s_ease-out,scaleIn_0.3s_ease-out]'
        )}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className={cn(
              'text-3xl sm:text-4xl font-bold text-primary text-glow mb-2',
              isNewHighScore && 'animate-glitch'
            )}
          >
            Game Over
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your reflexes have been tested!
          </p>
        </div>

        {/* Score Display */}
        <div className="text-center py-6 mb-6 border-y border-border">
          <p className="text-sm text-muted-foreground mb-2">Final Score</p>
          <p className="text-5xl sm:text-6xl font-bold text-primary text-glow mb-4">
            {score}
          </p>

          {/* High Score Indicator */}
          {isNewHighScore && (
            <div
              className={cn(
                'mt-4 p-3 bg-primary/30 border-4 border-primary pixel-border',
                'animate-[pulse_1s_ease-in-out_infinite]'
              )}
            >
              <p className="text-primary font-bold text-lg text-glow">
                🏆 New High Score! 🏆
              </p>
            </div>
          )}

          {!isNewHighScore && highScore > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">High Score</p>
              <p className="text-xl font-semibold text-primary">{highScore}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {(bestCombo > 0 || reactionTimeStats.allTimes.length > 0) && (
          <div className="mb-6 p-4 bg-card border-4 border-border pixel-border">
            <h3 className="text-sm font-semibold text-primary mb-3">Game Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {bestCombo > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Best Combo</p>
                  <p className="text-lg font-bold text-accent">{bestCombo}x</p>
                </div>
              )}
              {reactionTimeStats.average !== null && (
                <div>
                  <p className="text-muted-foreground mb-1">Avg Reaction</p>
                  <p className="text-lg font-bold text-primary">
                    {Math.round(reactionTimeStats.average)}ms
                  </p>
                </div>
              )}
              {reactionTimeStats.fastest !== null && (
                <div>
                  <p className="text-muted-foreground mb-1">Fastest</p>
                  <p className="text-lg font-bold text-green-400">
                    {Math.round(reactionTimeStats.fastest)}ms
                  </p>
                </div>
              )}
              {reactionTimeStats.allTimes.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Total Presses</p>
                  <p className="text-lg font-bold text-primary">
                    {reactionTimeStats.allTimes.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-lg',
              'bg-primary border-primary text-primary-foreground',
              'hover:border-accent hover:bg-accent',
              'transition-all duration-100 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary pixel-border'
            )}
          >
            Play Again
          </button>

          <Link
            href="/"
            className={cn(
              'w-full py-3 px-6 border-4 font-bold text-base text-center',
              'border-border bg-card text-foreground',
              'hover:border-primary hover:bg-primary/20',
              'transition-all duration-100',
              'focus:outline-none focus:ring-2 focus:ring-primary pixel-border'
            )}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

