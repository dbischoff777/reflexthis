'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * OrientationHandler component - Prompts users to rotate device to landscape
 * Only shows on game page when device is in portrait mode
 */
export function OrientationHandler() {
  const [isLandscape, setIsLandscape] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkOrientation = () => {
      // Check if width > height (landscape)
      const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
      setIsLandscape(isCurrentlyLandscape);
    };

    // Check on mount
    checkOrientation();

    // Add listeners for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Also listen to screen orientation API if available
    if (screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) return null;

  // Don't show overlay if already in landscape
  if (isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <div className="mb-4 text-5xl animate-pulse">📱↔️</div>
        <h2 className="text-xl sm:text-2xl font-bold text-primary text-glow mb-2">
          Please Rotate Your Device
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          ReflexThis works best in landscape orientation for optimal gameplay experience.
        </p>
        <div className="mt-6 text-xs text-muted-foreground/70">
          <p>Hold your device horizontally</p>
        </div>
      </div>
    </div>
  );
}

