'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getAchievementById } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useGameState } from '@/lib/GameContext';

interface AchievementNotificationProps {
  achievementIds: string[];
}

const RARITY_COLORS = {
  common: 'border-border bg-card',
  rare: 'border-primary bg-primary/10',
  epic: 'border-secondary bg-secondary/10',
  legendary: 'border-chart-3 bg-chart-3/10',
};

/**
 * Achievement notification component that displays unlocked achievements
 * Optimized with React.memo and proper cleanup
 */
export const AchievementNotification = React.memo(function AchievementNotification({ achievementIds }: AchievementNotificationProps) {
  const { language } = useGameState();
  const [visibleAchievements, setVisibleAchievements] = useState<string[]>([]);

  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  useEffect(() => {
    if (achievementIds.length === 0) {
      setVisibleAchievements([]);
      return;
    }

    // Clear any existing timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();

    // Show achievements one at a time with delay
    achievementIds.forEach((id, index) => {
      const showTimer = setTimeout(() => {
        setVisibleAchievements((prev) => [...prev, id]);
        timersRef.current.delete(showTimer);
        
        // Hide after 4 seconds
        const hideTimer = setTimeout(() => {
          setVisibleAchievements((prev) => prev.filter(aid => aid !== id));
          timersRef.current.delete(hideTimer);
        }, 4000);
        timersRef.current.add(hideTimer);
      }, index * 500); // Stagger notifications
      timersRef.current.add(showTimer);
    });
    
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [achievementIds]);

  if (visibleAchievements.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {visibleAchievements.map((id) => {
        const achievement = getAchievementById(id);
        if (!achievement) return null;

        const rarityColor = RARITY_COLORS[achievement.rarity];

        return (
          <div
            key={id}
            className={cn(
              'p-4 border-4 pixel-border',
              rarityColor,
              'min-w-[280px] max-w-[320px] shadow-lg',
              'animate-[slideInRight_0.3s_ease-out]'
            )}
            style={{
              transform: 'translateZ(0)',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">{achievement.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-primary text-sm">
                    {t(language, 'stats.achievements.unlocked')}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 border pixel-border',
                      achievement.rarity === 'legendary' && 'bg-chart-3/20 border-chart-3 text-chart-3',
                      achievement.rarity === 'epic' && 'bg-secondary/20 border-secondary text-secondary',
                      achievement.rarity === 'rare' && 'bg-primary/20 border-primary text-primary',
                      achievement.rarity === 'common' && 'bg-muted border-border text-muted-foreground'
                    )}
                  >
                    {t(language, `rarity.${achievement.rarity}`).toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1 break-words">
                  {(() => {
                    const key = `achievement.${achievement.id}.title`;
                    const translated = t(language, key);
                    return translated === key ? achievement.title : translated;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  {(() => {
                    const key = `achievement.${achievement.id}.description`;
                    const translated = t(language, key);
                    return translated === key ? achievement.description : translated;
                  })()}
                </p>
              </div>
            </div>
          </div>
        );
      }      )}
    </div>
  );
});

