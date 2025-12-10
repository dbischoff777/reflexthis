'use client';

import { useState } from 'react';
import { SessionStatistics } from '@/lib/sessionStats';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { GameMode } from '@/lib/gameModes';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { ChallengesDisplay } from '@/components/ChallengesDisplay';
import { ProgressionDisplay } from '@/components/ProgressionDisplay';

interface StatisticsHubProps {
  stats: SessionStatistics;
  gameMode?: GameMode;
}

type HubTabType = 'challenges' | 'progression' | 'quests' | 'difficultyTimeline' | 'whatsNew' | 'stats';

/**
 * StatisticsHub - Tab-based hub structure for statistics and engagement features
 */
export function StatisticsHub({ stats, gameMode }: StatisticsHubProps) {
  const { language } = useGameState();
  const [activeTab, setActiveTab] = useState<HubTabType>('stats');

  const tabs: { id: HubTabType; label: string }[] = [
    { id: 'challenges', label: t(language, 'hub.tab.challenges') },
    { id: 'progression', label: t(language, 'hub.tab.progression') },
    { id: 'quests', label: t(language, 'hub.tab.quests') },
    { id: 'difficultyTimeline', label: t(language, 'hub.tab.difficultyTimeline') },
    { id: 'whatsNew', label: t(language, 'hub.tab.whatsNew') },
    { id: 'stats', label: t(language, 'hub.tab.stats') },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 mb-4 border-b overflow-x-auto justify-center" style={{ borderColor: '#3E7CAC' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative shrink-0 px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold transition-all duration-200 rounded-t-md whitespace-nowrap',
              activeTab === tab.id
                ? 'text-foreground border-b-2'
                : 'text-foreground/70 hover:text-foreground border-b-2 border-transparent'
            )}
            style={activeTab === tab.id ? {
              backgroundColor: 'rgba(62, 124, 172, 0.2)',
              borderBottomColor: '#3E7CAC',
              boxShadow: '0 3px 0 rgba(62, 124, 172, 0.5)',
            } : {}}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'challenges' && (
          <ChallengesDisplay />
        )}

        {activeTab === 'progression' && (
          <ProgressionDisplay />
        )}

        {activeTab === 'quests' && (
          <div className="p-4 space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">{t(language, 'hub.quests.title')}</h3>
            <div className="space-y-3">
              <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <p className="text-sm sm:text-base text-muted-foreground">{t(language, 'hub.quests.placeholder')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'difficultyTimeline' && (
          <div className="p-4 space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">{t(language, 'hub.difficultyTimeline.title')}</h3>
            <div className="space-y-3">
              <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <p className="text-sm sm:text-base text-muted-foreground">{t(language, 'hub.difficultyTimeline.placeholder')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsNew' && (
          <div className="p-4 space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">{t(language, 'hub.whatsNew.title')}</h3>
            <div className="space-y-3">
              <div className="p-4 border-2 pixel-border" style={{ backgroundColor: 'rgba(0, 58, 99, 0.6)', borderColor: '#3E7CAC' }}>
                <p className="text-sm sm:text-base text-muted-foreground">{t(language, 'hub.whatsNew.placeholder')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-4">
            <SessionStatsDisplay stats={stats} hideTitle gameMode={gameMode} />
          </div>
        )}
      </div>
    </div>
  );
}

