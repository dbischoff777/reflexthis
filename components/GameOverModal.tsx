'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/Confetti';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  onRestart: () => void;
}

/**
 * GameOverModal component - Displays game over screen with score and restart options
 */
export function GameOverModal({
  score,
  highScore,
  isNewHighScore,
  onRestart,
}: GameOverModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti for new high score
  useEffect(() => {
    if (isNewHighScore) {
      setShowConfetti(true);
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewHighScore]);

  return (
    <>
      <Confetti active={showConfetti} duration={3000} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={cn(
          'relative w-full max-w-md rounded-lg border-2 p-6 sm:p-8',
          'bg-card border-primary shadow-glow',
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
                'mt-4 p-3 bg-primary/20 border border-primary rounded-md',
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

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className={cn(
              'w-full py-3 px-6 rounded-full font-bold text-lg',
              'bg-gradient-to-r from-primary via-accent to-secondary',
              'text-primary-foreground',
              'hover:shadow-glow transition-all duration-300',
              'hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card'
            )}
          >
            Play Again
          </button>

          <Link
            href="/"
            className={cn(
              'w-full py-3 px-6 rounded-full font-bold text-base text-center',
              'border-2 border-border text-foreground',
              'hover:border-primary/50 hover:bg-card/80',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card'
            )}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

