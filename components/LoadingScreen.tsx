'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
}

/**
 * LoadingScreen component - Retro Sinclair-style loading animation
 * Optimized with requestAnimationFrame for smoother animations
 */
export const LoadingScreen = React.memo(function LoadingScreen({ message = 'LOADING...', onComplete }: LoadingScreenProps) {
  const { language } = useGameState();
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const rafIdRef = useRef<number | null>(null);
  const dotsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  
  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  const statusMessages = useMemo(
    () => [
      t(language, 'ready.status.1'),
      t(language, 'ready.status.2'),
      t(language, 'ready.status.3'),
      t(language, 'ready.status.4'),
      t(language, 'ready.status.5'),
    ],
    [language]
  );
  const [statusIndex, setStatusIndex] = useState(0);

  // Animate progress using requestAnimationFrame for smoother 60fps animation
  // Reduced from 3s to 1.5s for better perceived performance
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(100, (elapsed / 1500) * 100); // Reduced to 1.5 seconds
      
      setProgress(newProgress);
      
      if (newProgress < 100) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        // Complete immediately for better INP
        if (onCompleteRef.current) {
          setTimeout(onCompleteRef.current, 100); // Reduced from 300ms to 100ms
        }
      }
    };
    
    rafIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Animate dots - less frequent updates
  useEffect(() => {
    dotsTimerRef.current = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 300);

    return () => {
      if (dotsTimerRef.current) {
        clearInterval(dotsTimerRef.current);
      }
    };
  }, []);

  // Cycle through status messages
  useEffect(() => {
    if (statusMessages.length === 0) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [statusMessages.length]);

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
                width: `${Math.round(progress)}%`,
                imageRendering: 'pixelated',
              }}
            />
          </div>
          
          {/* Progress percentage */}
          <p className="text-sm text-muted-foreground font-mono">
            {Math.round(progress)}%
          </p>
        </div>
        
        {/* Immersive system status line */}
        <div className="pt-4 border-t border-border/40 max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="tracking-[0.25em] uppercase text-[10px] text-foreground/70">
              {t(language, 'ready.status.label')}
            </span>
            <span className="font-mono text-primary/90 animate-pulse whitespace-pre-wrap">
              {statusMessages[statusIndex]}
            </span>
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
});

