'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getKeybindings, getButtonIdForKey } from '@/lib/keybindings';

/**
 * Hook for keyboard controls in the game
 * Uses customizable keybindings from settings
 * Dynamically loads keybindings on each key press to support runtime changes
 */
export function useKeyboardControls(
  onButtonPress: (buttonId: number) => void,
  enabled: boolean = true
) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const key = e.key;
      
      // Get current keybindings dynamically (supports runtime changes)
      const keybindings = getKeybindings();
      
      // Get button ID for this key using current keybindings
      const buttonId = getButtonIdForKey(key, keybindings);
      
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

