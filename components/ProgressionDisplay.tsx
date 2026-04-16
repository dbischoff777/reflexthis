'use client';

import { useState, useEffect } from 'react';
import { getUserProgress, getXPProgress, getXPRequiredForNextLevel, getLevelConfig, type LevelReward } from '@/lib/progression';
import { useGameState } from '@/lib/GameContext';

export function ProgressionDisplay() {
  const { language } = useGameState();
  const [progress, setProgress] = useState(getUserProgress());
  const [xpProgress, setXPProgress] = useState(getXPProgress());
  const [xpRequired, setXPRequired] = useState(getXPRequiredForNextLevel());

  useEffect(() => {
    // Refresh progress data
    const currentProgress = getUserProgress();
    setProgress(currentProgress);
    setXPProgress(getXPProgress());
    setXPRequired(getXPRequiredForNextLevel());
  }, []);

  const levelConfig = getLevelConfig(progress.level);
  const nextLevelConfig = getLevelConfig(progress.level + 1);
  const progressPercent = Math.min(100, (xpProgress * 100));

  return (
    <div className="p-4 space-y-6">
      {/* Current Level Display */}
      <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Current Level</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground">{progress.level}</p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total XP</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{progress.totalXP.toLocaleString()}</p>
          </div>
        </div>

        {/* XP Progress Bar */}
        {nextLevelConfig ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>{progress.currentXP} / {levelConfig?.xpRequired || 0} XP</span>
              <span>{Math.max(0, (levelConfig?.xpRequired || 0) - progress.currentXP)} XP to Level {progress.level + 1}</span>
            </div>
            <div className="w-full h-4 sm:h-5 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: '#3E7CAC' }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: '#3E7CAC',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm sm:text-base font-semibold text-foreground">Max Level Reached! 🎉</p>
          </div>
        )}
      </div>

      {/* Next Level Rewards Preview */}
      {nextLevelConfig && nextLevelConfig.rewards && nextLevelConfig.rewards.length > 0 && (
        <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.4)', borderColor: '#3E7CAC' }}>
          <p className="text-sm sm:text-base font-semibold text-foreground mb-3">Next Level Rewards</p>
          <div className="space-y-2">
            {nextLevelConfig.rewards.map((reward, index) => (
              <RewardItem key={index} reward={reward} />
            ))}
          </div>
        </div>
      )}

      {/* Cosmetics (Coming Soon) */}
      <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.4)', borderColor: '#3E7CAC' }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm sm:text-base font-semibold text-foreground">Customize Cosmetics</p>
          <span className="text-xs px-2 py-0.5 border pixel-border uppercase tracking-wide text-chart-3" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
            Coming Soon
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground wrap-break-word">
          Cosmetic themes, particle trails, and hit sounds will be available in a future update.
        </p>
      </div>
    </div>
  );
}

function RewardItem({ reward }: { reward: LevelReward }) {
  if (reward.type === 'cosmetic' && reward.cosmeticId) {
    return (
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span className="text-muted-foreground">🎨</span>
        <span className="text-foreground">Unlock: {reward.cosmeticId.replace('theme-', '').replace('trail-', '').replace(/-/g, ' ')}</span>
      </div>
    );
  } else if (reward.type === 'ticket' && reward.amount) {
    return (
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span className="text-muted-foreground">🎫</span>
        <span className="text-foreground">{reward.amount} Cosmetic Ticket{reward.amount !== 1 ? 's' : ''}</span>
      </div>
    );
  }
  return null;
}

