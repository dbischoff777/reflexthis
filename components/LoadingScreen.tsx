'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
}

/**
 * LoadingScreen component - Retro Sinclair-style loading animation
 */
export function LoadingScreen({ message = 'LOADING...', onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          if (onComplete) {
            setTimeout(onComplete, 300);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 300);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center crt-scanlines">
      <div className="text-center space-y-6">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary text-glow pixel-border px-4 py-2 inline-block border-4 border-primary">
          REFLEX THIS
        </h1>
        
        {/* Loading message */}
        <div className="space-y-4">
          <p className="text-xl sm:text-2xl font-bold text-primary pixel-border px-3 py-1 inline-block border-2 border-primary">
            {message}{dots}
          </p>
          
          {/* Progress bar */}
          <div className="w-64 sm:w-80 mx-auto border-4 border-primary pixel-border bg-card">
            <div
              className="h-6 bg-primary transition-all duration-100"
              style={{
                width: `${progress}%`,
                imageRendering: 'pixelated',
              }}
            />
          </div>
          
          {/* Progress percentage */}
          <p className="text-sm text-muted-foreground font-mono">
            {progress}%
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

