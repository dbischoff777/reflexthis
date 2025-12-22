'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEventNotification, GameEventType } from '@/components/GameEventNotification';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

interface UseGameEventNotificationsOptions {
  adaptiveDifficultyMultiplier: number;
  buttonHitRequirements: Record<number, number>;
  combo: number;
  isReady: boolean;
  gameOver: boolean;
}

/**
 * Hook to detect game events and trigger notifications
 * Tracks:
 * - Reaction time changes (adaptive difficulty multiplier)
 * - Multi-hit buttons appearing
 */
export function useGameEventNotifications({
  adaptiveDifficultyMultiplier,
  buttonHitRequirements,
  combo,
  isReady,
  gameOver,
}: UseGameEventNotificationsOptions) {
  const { language } = useGameState();
  const [events, setEvents] = useState<GameEventNotification[]>([]);
  
  // Track previous values to detect changes
  const previousMultiplierRef = useRef<number>(1.0);
  const previousComboRef = useRef<number>(0);
  const eventIdCounterRef = useRef(0);
  
  // Track when game becomes ready to initialize
  const wasReadyRef = useRef(false);
  
  // Reset tracking when game starts or ends
  useEffect(() => {
    if (!isReady || gameOver) {
      previousComboRef.current = 0;
      previousMultiplierRef.current = 1.0;
      wasReadyRef.current = false;
      return;
    }
    
    // Initialize tracking when game first becomes ready
    if (isReady && !gameOver && !wasReadyRef.current) {
      previousMultiplierRef.current = adaptiveDifficultyMultiplier;
      // Always start from 0 to detect threshold crossings
      previousComboRef.current = 0;
      wasReadyRef.current = true;
    }
  }, [isReady, gameOver, adaptiveDifficultyMultiplier]);

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `event-${Date.now()}-${++eventIdCounterRef.current}`;
  }, []);

  // Track reaction time changes (adaptive difficulty multiplier)
  useEffect(() => {
    if (!isReady || gameOver || !wasReadyRef.current) return;

    const previousMultiplier = previousMultiplierRef.current;
    const currentMultiplier = adaptiveDifficultyMultiplier;
    const difference = Math.abs(currentMultiplier - previousMultiplier);

    // Notify on any significant change (>= 0.1) - show live every time
    if (difference >= 0.1) {
      const eventType: GameEventType = currentMultiplier < previousMultiplier 
        ? 'reaction-time-easier' 
        : 'reaction-time-harder';
      
      const message = currentMultiplier < previousMultiplier
        ? t(language, 'notification.reaction-time.easier')
        : t(language, 'notification.reaction-time.harder');

      setEvents((prev) => [
        ...prev,
        {
          id: generateEventId(),
          type: eventType,
          message,
          timestamp: Date.now(),
        },
      ]);
    }

    previousMultiplierRef.current = currentMultiplier;
  }, [adaptiveDifficultyMultiplier, isReady, gameOver, language, generateEventId]);

  // Track multi-hit buttons appearing and unlock threshold
  useEffect(() => {
    if (!isReady || gameOver || !wasReadyRef.current) return;

    const previousCombo = previousComboRef.current;

    // Show notification only when combo reaches 15 (unlock threshold) - trigger once
    if (previousCombo < 15 && combo >= 15) {
      const message = t(language, 'notification.multi-hit.starting');
      setEvents((prev) => [
        ...prev,
        {
          id: generateEventId(),
          type: 'multi-hit-enabled',
          message,
          timestamp: Date.now(),
        },
      ]);
    }

    // Update tracking
    previousComboRef.current = combo;
  }, [combo, isReady, gameOver, language, generateEventId]);

  // Clean up old events (older than 5 seconds)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setEvents((prev) => prev.filter(event => now - event.timestamp < 5000));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return events;
}
