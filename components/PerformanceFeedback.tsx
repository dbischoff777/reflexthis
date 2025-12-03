'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { t, type Language } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

export type FeedbackType = 
  | 'reaction-fast'
  | 'reaction-very-fast'
  | 'reaction-slow'
  | 'combo-5'
  | 'combo-10'
  | 'combo-20'
  | 'combo-30'
  | 'combo-50'
  | 'score-milestone'
  | 'new-best'
  | 'perfect-timing'
  | 'keep-going';

interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  message: string;
  color: string;
  timestamp: number;
}

interface PerformanceFeedbackProps {
  reactionTime: number | null;
  combo: number;
  score: number;
  previousCombo: number;
  previousScore: number;
  isNewBestReaction: boolean;
}

/**
 * PerformanceFeedback component - Shows popup feedback messages based on player performance
 */
// Message pools for variety - functions that return translated messages
function getReactionVeryFastMessages(language: Language): string[] {
  return [
    t(language, 'feedback.lightning'),
    t(language, 'feedback.incredible'),
    t(language, 'feedback.blazing'),
    t(language, 'feedback.unstoppable'),
    t(language, 'feedback.legendary'),
  ];
}

function getReactionFastMessages(language: Language): string[] {
  return [
    t(language, 'feedback.greatSpeed'),
    t(language, 'feedback.nice'),
    t(language, 'feedback.wellDone'),
    t(language, 'feedback.excellent'),
    t(language, 'feedback.awesome'),
    t(language, 'feedback.fastReflex'),
  ];
}

function getReactionSlowMessages(language: Language): string[] {
  return [
    t(language, 'feedback.keepGoing'),
    t(language, 'feedback.youGotThis'),
    t(language, 'feedback.stayFocused'),
    t(language, 'feedback.dontGiveUp'),
    t(language, 'feedback.keepTrying'),
    t(language, 'feedback.almostThere'),
  ];
}

function getCombo5Messages(language: Language): string[] {
  return [
    t(language, 'feedback.combo5'),
    t(language, 'feedback.comboStart'),
    t(language, 'feedback.onRoll'),
  ];
}

function getCombo10Messages(language: Language): string[] {
  return [
    t(language, 'feedback.combo10'),
    t(language, 'feedback.doubleDigits'),
    t(language, 'feedback.heatingUp'),
  ];
}

function getCombo20Messages(language: Language): string[] {
  return [
    t(language, 'feedback.combo20'),
    t(language, 'feedback.onFire'),
    t(language, 'feedback.unstoppable'),
  ];
}

function getCombo30Messages(language: Language): string[] {
  return [
    t(language, 'feedback.combo30'),
    t(language, 'feedback.incredible'),
    t(language, 'feedback.legendary'),
  ];
}

function getCombo50Messages(language: Language): string[] {
  return [
    t(language, 'feedback.combo50'),
    t(language, 'feedback.masterLevel'),
    t(language, 'feedback.perfection'),
  ];
}

function getComboHighMessages(language: Language): string[] {
  return [
    t(language, 'feedback.amazingCombo'),
    t(language, 'feedback.incredibleStreak'),
    t(language, 'feedback.legendaryRun'),
  ];
}

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function PerformanceFeedback({
  reactionTime,
  combo,
  score,
  previousCombo,
  previousScore,
  isNewBestReaction,
}: PerformanceFeedbackProps) {
  const { language } = useGameState();
  const [currentMessage, setCurrentMessage] = useState<FeedbackMessage | null>(null);
  const messageIdCounter = useRef(0);
  const lastProcessedComboRef = useRef(previousCombo);
  const lastProcessedScoreRef = useRef(previousScore);
  const lastReactionTimeRef = useRef<number | null>(null);
  const lastHighImpactTimeRef = useRef(0);
  const lastLowImpactTimeRef = useRef(0);

  // Generate feedback based on performance metrics
  useEffect(() => {
    let newMessage: FeedbackMessage | null = null;
    let priority = 0; // Higher priority messages override lower ones
    
    // Only process reaction time if it's new (different from last processed)
    if (reactionTime !== null && reactionTime !== lastReactionTimeRef.current) {
      lastReactionTimeRef.current = reactionTime;

      // Positive feedback for fast reactions (lower priority than combo/score).
      // Only show occasionally and when the player has at least a small combo,
      // to avoid spamming early in the run.
      if (reactionTime > 0 && reactionTime < 250 && combo >= 5 && Math.random() < 0.4) {
        if (reactionTime < 150) {
          newMessage = {
            id: `msg-${messageIdCounter.current++}`,
            type: 'reaction-very-fast',
            message: getRandomMessage(getReactionVeryFastMessages(language)),
            color: '#00ff00',
            timestamp: Date.now(),
          };
          priority = 50; // Lower priority than combo/score
        } else if (reactionTime < 250) {
          newMessage = {
            id: `msg-${messageIdCounter.current++}`,
            type: 'reaction-fast',
            message: getRandomMessage(getReactionFastMessages(language)),
            color: '#00ff9f',
            timestamp: Date.now(),
          };
          priority = 40; // Lower priority than combo/score
        }
      } else if (reactionTime >= 450) {
        // Gentle coaching for slower reactions.
        // - More likely early in the run (low combo)
        // - Still occasionally available at higher combos, but rarer,
        //   so coaching remains present without becoming noisy.
        const isEarlyCombo = combo < 5;
        const chance = isEarlyCombo ? 0.25 : 0.08;

        if (Math.random() < chance) {
          newMessage = {
            id: `msg-${messageIdCounter.current++}`,
            type: 'reaction-slow',
            message: getRandomMessage(getReactionSlowMessages(language)),
            color: '#ffff66',
            timestamp: Date.now(),
          };
          priority = 20; // Low priority – combo/score messages will override
        }
      }
    }

    // Combo milestone feedback - Check if combo increased (HIGHEST PRIORITY)
    if (combo > lastProcessedComboRef.current) {
      let comboMessage: FeedbackMessage | null = null;
      let comboPriority = 0;
      
      if (combo === 5) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-5',
          message: getRandomMessage(getCombo5Messages(language)),
          color: '#00f0ff',
          timestamp: Date.now(),
        };
        comboPriority = 90;
      } else if (combo === 10) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-10',
          message: getRandomMessage(getCombo10Messages(language)),
          color: '#00ffff',
          timestamp: Date.now(),
        };
        comboPriority = 92;
      } else if (combo === 20) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-20',
          message: getRandomMessage(getCombo20Messages(language)),
          color: '#ff00ff',
          timestamp: Date.now(),
        };
        comboPriority = 94;
      } else if (combo === 30) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-30',
          message: getRandomMessage(getCombo30Messages(language)),
          color: '#ff00ff',
          timestamp: Date.now(),
        };
        comboPriority = 96;
      } else if (combo === 50) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-50',
          message: getRandomMessage(getCombo50Messages(language)),
          color: '#ff00ff',
          timestamp: Date.now(),
        };
        comboPriority = 98;
      } else if (combo > 0 && combo % 10 === 0 && combo > 10) {
        comboMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'combo-10',
          message: getRandomMessage(getComboHighMessages(language)),
          color: '#ff00ff',
          timestamp: Date.now(),
        };
        comboPriority = 94;
      }
      
      // Combo messages always override reaction time messages
      if (comboMessage && comboPriority > priority) {
        newMessage = comboMessage;
        priority = comboPriority;
      }
    }

    // Score milestone feedback (every 100 points) - HIGHEST PRIORITY
    const scoreDiff = score - lastProcessedScoreRef.current;
    if (scoreDiff > 0) {
      const previousMilestone = Math.floor(lastProcessedScoreRef.current / 100);
      const currentMilestone = Math.floor(score / 100);
      
      if (currentMilestone > previousMilestone && score >= 100) {
        const scoreMessage: FeedbackMessage = {
          id: `msg-${messageIdCounter.current++}`,
          type: 'score-milestone',
          message: `${currentMilestone * 100} POINTS!`,
          color: '#ffff00',
          timestamp: Date.now(),
        };
        const scorePriority = 95;
        
        // Score messages always override reaction time, but combo can override score
        if (scorePriority > priority) {
          newMessage = scoreMessage;
          priority = scorePriority;
        }
      }
    }

    // Set the single message (replaces any existing message), with a simple cooldown.
    // High-impact messages (combo/score milestones) use their own cooldown and
    // are not blocked by recent low-impact reaction messages.
    if (newMessage) {
      const now = Date.now();
      const isHighImpact =
        newMessage.type.startsWith('combo-') ||
        newMessage.type === 'score-milestone' ||
        newMessage.type === 'new-best' ||
        newMessage.type === 'perfect-timing';

      if (isHighImpact) {
        const timeSinceHigh = now - lastHighImpactTimeRef.current;
        const minGapHighMs = 800;
        if (timeSinceHigh >= minGapHighMs) {
          lastHighImpactTimeRef.current = now;
          setCurrentMessage(newMessage);
        }
      } else {
        const timeSinceLow = now - lastLowImpactTimeRef.current;
        const minGapLowMs = 2500;
        if (timeSinceLow >= minGapLowMs) {
          lastLowImpactTimeRef.current = now;
          setCurrentMessage(newMessage);
        }
      }
    }

    // Update refs only when values actually change
    if (combo !== lastProcessedComboRef.current) {
      lastProcessedComboRef.current = combo;
    }
    if (score !== lastProcessedScoreRef.current) {
      lastProcessedScoreRef.current = score;
    }
  }, [reactionTime, combo, score, isNewBestReaction]);

  // Remove message after it expires
  useEffect(() => {
    if (!currentMessage) return;
    
    const timer = setTimeout(() => {
      setCurrentMessage(null);
    }, 2000); // Messages last 2 seconds

    return () => clearTimeout(timer);
  }, [currentMessage]);

  if (!currentMessage) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute top-24 sm:top-28 md:top-32 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
        <FeedbackPopup 
          key={currentMessage.id} 
          message={currentMessage} 
        />
      </div>
    </div>
  );
}

interface FeedbackPopupProps {
  message: FeedbackMessage;
}

function FeedbackPopup({ message }: FeedbackPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in
    setIsVisible(true);

    // Start exit animation after 1.5 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // Remove after animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  const getSizeClass = () => {
    if (message.type.includes('combo-50') || message.type === 'new-best') {
      return 'text-lg sm:text-xl md:text-2xl';
    } else if (message.type.includes('combo-20') || message.type.includes('combo-30')) {
      return 'text-base sm:text-lg md:text-xl';
    } else if (message.type.includes('combo-10') || message.type === 'score-milestone') {
      return 'text-sm sm:text-base md:text-lg';
    }
    return 'text-xs sm:text-sm md:text-base';
  };

  return (
    <div
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
          'pixel-border px-4 py-2 sm:px-6 sm:py-3',
          'font-bold text-center',
          'text-glow',
          getSizeClass(),
          'border-4',
          'shadow-[0_0_20px_currentColor,0_0_40px_currentColor,0_0_60px_currentColor]'
        )}
        style={{
          color: message.color,
          borderColor: message.color,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          imageRendering: 'pixelated' as any,
          textShadow: `0 0 10px ${message.color}, 0 0 20px ${message.color}, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000`,
        }}
      >
        {message.message}
      </div>
    </div>
  );
}

