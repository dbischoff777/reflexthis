'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

export type GameEventType = 
  | 'reaction-time-easier'
  | 'reaction-time-harder'
  | 'multi-hit-enabled';

export interface GameEventNotification {
  id: string;
  type: GameEventType;
  message: string;
  timestamp: number;
}

interface GameEventNotificationProps {
  events: GameEventNotification[];
}

/**
 * Game event notification component that displays pop-up messages for game events
 * like reaction time changes and multi-hit buttons
 * Only shows one notification at a time, queues others
 */
export const GameEventNotification = React.memo(function GameEventNotification({ 
  events 
}: GameEventNotificationProps) {
  const { language } = useGameState();
  const [currentNotification, setCurrentNotification] = useState<GameEventNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  
  // Process new events - show one at a time (similar to PerformanceFeedback)
  useEffect(() => {
    if (events.length === 0) {
      setCurrentNotification(null);
      setIsVisible(false);
      setIsExiting(false);
      return;
    }

    // Find new events that haven't been processed yet
    const newEvents = events.filter(event => !processedEventIdsRef.current.has(event.id));
    
    if (newEvents.length === 0) return;

    // Mark new events as processed
    newEvents.forEach(event => processedEventIdsRef.current.add(event.id));

    // Show the first new event (one at a time)
    if (newEvents.length > 0 && !currentNotification) {
      setCurrentNotification(newEvents[0]);
      setIsVisible(true);
      setIsExiting(false);
    }
  }, [events, currentNotification]);

  // Animation and removal logic (matching PerformanceFeedback pattern)
  useEffect(() => {
    if (!currentNotification || !isVisible) return;
    
    // Start exit animation after 1.5 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // Remove after animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      setCurrentNotification(null);
      setIsExiting(false);
    }, 2000); // 1.5s display + 0.5s exit animation

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [currentNotification, isVisible]);

  if (!currentNotification || !isVisible) return null;

  const getEventColor = (type: GameEventType): string => {
    switch (type) {
      case 'reaction-time-easier':
        return '#4ade80'; // Green for easier
      case 'reaction-time-harder':
        return '#f87171'; // Red for harder
      case 'multi-hit-enabled':
        return '#fbbf24'; // Yellow/amber for multi-hit
      default:
        return '#3b82f6'; // Default blue
    }
  };


  const color = getEventColor(currentNotification.type);

  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 z-50 pointer-events-none game-event-notification">
      <div
        key={currentNotification.id}
        className={cn(
          'pointer-events-none',
          'flex items-center justify-center',
          'animate-feedback-popup',
          isExiting && 'animate-feedback-exit'
        )}
        style={{
          animationDuration: isExiting ? '0.5s' : '0.3s',
        }}
      >
        <div
          className={cn(
            'pixel-border px-5 py-3 sm:px-7 sm:py-4',
            'font-bold text-center',
            'text-glow',
            'text-sm sm:text-base md:text-lg',
            'border-4',
            'shadow-[0_0_25px_currentColor,0_0_50px_currentColor,0_0_75px_currentColor,0_4px_12px_rgba(0,0,0,0.8)]'
          )}
          style={{
            color: color,
            borderColor: color,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            imageRendering: 'pixelated' as any,
            textShadow: `0 0 12px ${color}, 0 0 24px ${color}, 0 0 36px ${color}80, 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000`,
            backdropFilter: 'blur(4px)',
          }}
        >
          {currentNotification.message.toUpperCase()}
        </div>
      </div>
    </div>
  );
});
