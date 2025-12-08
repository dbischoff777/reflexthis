'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getKeybindings, getButtonIdForKey } from '@/lib/keybindings';
import { InputBuffer, InputLatencyMonitor } from '@/lib/inputBuffer';

/**
 * Hook for keyboard controls in the game
 * Uses customizable keybindings from settings
 * Dynamically loads keybindings on each key press to support runtime changes
 * Optimized with input buffering and latency monitoring
 */
export function useKeyboardControls(
  onButtonPress: (buttonId: number) => void,
  enabled: boolean = true,
  enableBuffering: boolean = true,
  enableLatencyMonitoring: boolean = process.env.NODE_ENV === 'development'
) {
  const inputBufferRef = useRef<InputBuffer | null>(null);
  const latencyMonitorRef = useRef<InputLatencyMonitor | null>(null);
  const processingRef = useRef(false);

  // Initialize input buffer and latency monitor
  useEffect(() => {
    if (enableBuffering) {
      inputBufferRef.current = new InputBuffer(5, 100);
    }
    if (enableLatencyMonitoring) {
      latencyMonitorRef.current = new InputLatencyMonitor();
    }
  }, [enableBuffering, enableLatencyMonitoring]);

  // Process buffered inputs using requestAnimationFrame for optimal timing
  useEffect(() => {
    if (!enableBuffering || !inputBufferRef.current) return;

    let rafId: number | null = null;

    const processBuffer = () => {
      if (!inputBufferRef.current || processingRef.current) {
        rafId = requestAnimationFrame(processBuffer);
        return;
      }

      processingRef.current = true;
      const validInputs = inputBufferRef.current.processBuffer();

      // Process inputs in order
      validInputs.forEach((input) => {
        // Record input for latency monitoring
        if (latencyMonitorRef.current) {
          latencyMonitorRef.current.recordInput(input.buttonId);
        }
        
        // Execute button press with minimal delay
        onButtonPress(input.buttonId);
      });

      processingRef.current = false;
      rafId = requestAnimationFrame(processBuffer);
    };

    rafId = requestAnimationFrame(processBuffer);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enableBuffering, onButtonPress]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const key = e.key;
      
      // Get current keybindings dynamically (supports runtime changes)
      // Cache keybindings lookup for better performance
      const keybindings = getKeybindings();
      
      // Get button ID for this key using current keybindings
      const buttonId = getButtonIdForKey(key, keybindings);
      
      if (buttonId) {
        e.preventDefault();
        
        // Use input buffering if enabled, otherwise direct call
        if (enableBuffering && inputBufferRef.current) {
          inputBufferRef.current.addInput(buttonId, 'keyboard');
        } else {
          // Record input for latency monitoring
          if (latencyMonitorRef.current) {
            latencyMonitorRef.current.recordInput(buttonId);
          }
          
          // Direct call for immediate processing
          onButtonPress(buttonId);
        }
      }
    },
    [enabled, onButtonPress, enableBuffering]
  );

  useEffect(() => {
    if (enabled) {
      // Use capture phase for faster event handling
      window.addEventListener('keydown', handleKeyPress, { passive: false, capture: true });
      return () => {
        window.removeEventListener('keydown', handleKeyPress, { capture: true });
      };
    }
  }, [enabled, handleKeyPress]);

  // Return latency monitor for external access (dev mode)
  return {
    latencyMonitor: enableLatencyMonitoring ? latencyMonitorRef.current : null,
    inputBuffer: enableBuffering ? inputBufferRef.current : null,
  };
}

