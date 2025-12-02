'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { GameButtonGridWebGL } from './GameButton3DWebGL';

interface DemoModeProps {
  onStart?: () => void;
  // Called once the demo canvas has mounted and is safe to show
  onReady?: () => void;
}

/**
 * DemoMode component - Shows animated 3D demo of the game on title screen
 */
export function DemoMode({ onStart, onReady }: DemoModeProps) {
  const [highlightedButtons, setHighlightedButtons] = useState<number[]>([]);
  const [feedbackButtons, setFeedbackButtons] = useState<Map<number, 'success' | 'error'>>(new Map());
  // State version of highlightStartTime for memo dependency tracking
  const [highlightStartTime, setHighlightStartTime] = useState<number>(Date.now());
  const demoIndexRef = useRef(0);
  const idleStepsRef = useRef(0);
  
  // Track all timers for proper cleanup
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Demo sequence: cycles through buttons with varying patterns
  const demoSequence = [
    [5], [2], [8], [1], [6], [10], [3], [7], [4], [9],
    [1, 3], [4, 7], [2, 9], [5, 6], [8, 10],
    [1, 5, 9], [3, 6, 8], [2, 5, 10],
  ];

  // Highlight duration for demo (slower than actual game for visibility)
  const DEMO_HIGHLIGHT_DURATION = 800;

  // Inform parent as soon as the demo has mounted, so it can fade in
  useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  useEffect(() => {
    // Helper to create tracked timers
    const createTimer = (callback: () => void, delay: number): NodeJS.Timeout => {
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        callback();
      }, delay);
      timersRef.current.add(timer);
      return timer;
    };

    const cycleDemo = () => {
      // First few cycles: pure idle frames so the grid can settle visually
      if (idleStepsRef.current < 2) {
        idleStepsRef.current += 1;
        setHighlightedButtons([]);
        setFeedbackButtons(new Map());
        // Wait one highlight-duration before attempting real demo content
        createTimer(cycleDemo, DEMO_HIGHLIGHT_DURATION);
        return;
      }

      const currentSequence = demoSequence[demoIndexRef.current % demoSequence.length];
      setHighlightedButtons(currentSequence);
      setHighlightStartTime(Date.now());
      
      demoIndexRef.current++;
      
      // Simulate "pressing" the button at ~70% of duration
      createTimer(() => {
        // Show success feedback on the highlighted buttons
        const newFeedback = new Map<number, 'success' | 'error'>();
        currentSequence.forEach(id => newFeedback.set(id, 'success'));
        setFeedbackButtons(newFeedback);
        setHighlightedButtons([]);
        
        // Clear feedback after animation
        createTimer(() => {
          setFeedbackButtons(new Map());
        }, 300);
      }, DEMO_HIGHLIGHT_DURATION * 0.7);
      
      // Schedule next demo cycle
      createTimer(cycleDemo, DEMO_HIGHLIGHT_DURATION + 400);
    };

    // Start demo after initial delay
    createTimer(cycleDemo, 800);

    // Cleanup: clear all tracked timers on unmount
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  // Handle button press - triggers onStart callback
  const handleButtonPress = useCallback((index: number) => {
    if (onStart) {
      onStart();
    }
  }, [onStart]);

  // Memoized button data for the 3D grid to prevent unnecessary re-renders
  const buttons = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const id = i + 1;
      return {
        index: id,
        highlighted: highlightedButtons.includes(id),
        highlightStartTime: highlightedButtons.includes(id) ? highlightStartTime : undefined,
        pressFeedback: feedbackButtons.get(id) || null,
      };
    });
  }, [highlightedButtons, feedbackButtons, highlightStartTime]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="h-[280px] sm:h-[320px] md:h-[360px]">
        <GameButtonGridWebGL
          buttons={buttons}
          highlightDuration={DEMO_HIGHLIGHT_DURATION}
          onPress={handleButtonPress}
          disabled={false}
          showLabels={false}
        />
      </div>
    </div>
  );
}

