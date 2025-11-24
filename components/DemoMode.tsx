'use client';

import { useEffect, useState, useRef } from 'react';
import { GameButton } from './GameButton';
import { cn } from '@/lib/utils';

interface DemoModeProps {
  onStart?: () => void;
}

/**
 * DemoMode component - Shows animated demo of the game on title screen
 */
export function DemoMode({ onStart }: DemoModeProps) {
  const [highlightedButtons, setHighlightedButtons] = useState<number[]>([]);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const demoIndexRef = useRef(0);

  // Demo sequence: cycles through buttons
  const demoSequence = [
    [1], [4], [7], [2], [5], [8], [3], [6], [9],
    [1, 4], [2, 5], [3, 6], [4, 7], [5, 8],
    [1, 5, 9], [2, 6], [3, 7], [4, 8],
  ];

  useEffect(() => {
    const cycleDemo = () => {
      const currentSequence = demoSequence[demoIndexRef.current % demoSequence.length];
      setHighlightedButtons(currentSequence);
      
      demoIndexRef.current++;
      
      demoTimerRef.current = setTimeout(() => {
        setHighlightedButtons([]);
        setTimeout(cycleDemo, 300);
      }, 600);
    };

    // Start demo after initial delay
    const startTimer = setTimeout(cycleDemo, 1000);

    return () => {
      clearTimeout(startTimer);
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="button-grid">
        {/* Top Row - 3 buttons */}
        <div className="grid-row top-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
          {[1, 2, 3].map((id) => (
            <GameButton
              key={id}
              id={id}
              highlighted={highlightedButtons.includes(id)}
              onPress={onStart}
            />
          ))}
        </div>
        
        {/* Middle Row - 4 buttons */}
        <div className="grid-row middle-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
          {[4, 5, 6, 7].map((id) => (
            <GameButton
              key={id}
              id={id}
              highlighted={highlightedButtons.includes(id)}
              onPress={onStart}
            />
          ))}
        </div>
        
        {/* Bottom Row - 3 buttons */}
        <div className="grid-row bottom-row flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          {[8, 9, 10].map((id) => (
            <GameButton
              key={id}
              id={id}
              highlighted={highlightedButtons.includes(id)}
              onPress={onStart}
            />
          ))}
        </div>
      </div>
      
      {/* Demo indicator */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground pixel-border px-2 py-1 inline-block border-2 border-border">
          DEMO MODE
        </p>
      </div>
    </div>
  );
}

