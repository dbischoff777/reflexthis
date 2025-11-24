'use client';

import { useEffect, useCallback } from 'react';

/**
 * Hook for keyboard controls in the game
 * Maps number keys 1-0 to button IDs 1-10
 */
export function useKeyboardControls(
  onButtonPress: (buttonId: number) => void,
  enabled: boolean = true
) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Prevent default behavior for number keys
      const key = e.key;
      
      // Map number keys to button IDs
      // Keys: 1-9 map to buttons 1-9, 0 maps to button 10
      const keyToButtonMap: Record<string, number> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '0': 10,
      };

      const buttonId = keyToButtonMap[key];
      if (buttonId) {
        e.preventDefault();
        onButtonPress(buttonId);
      }
    },
    [enabled, onButtonPress]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [enabled, handleKeyPress]);
}

