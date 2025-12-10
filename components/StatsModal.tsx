'use client';

import { useEffect, useState } from 'react';
import { BackdropTransition, ModalTransition } from '@/components/Transition';
import { StatisticsHub } from '@/components/StatisticsHub';
import { SessionStatistics, calculateSessionStatisticsFromSessions, getGameSessions } from '@/lib/sessionStats';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { GameMode, GAME_MODES } from '@/lib/gameModes';

interface StatsModalProps {
  show: boolean;
  stats: SessionStatistics;
  onClose: () => void;
  gameMode?: GameMode;
}

/**
 * StatsModal - Modal wrapper for SessionStatsDisplay with transitions and ESC key support
 */
export function StatsModal({ show, stats, onClose, gameMode: initialGameMode }: StatsModalProps) {
  const { language } = useGameState();
  const [selectedMode, setSelectedMode] = useState<GameMode | undefined>(initialGameMode);
  const modes: GameMode[] = ['reflex', 'sequence', 'survival', 'nightmare', 'oddOneOut'];
  
  // Update selected mode when initialGameMode prop changes
  useEffect(() => {
    setSelectedMode(initialGameMode);
  }, [initialGameMode]);
  
  // Filter stats by selected game mode
  const filteredStats = selectedMode 
    ? (() => {
        const allSessions = getGameSessions();
        const modeSessions = allSessions.filter(s => s.gameMode === selectedMode);
        return calculateSessionStatisticsFromSessions(modeSessions);
      })()
    : stats;

  // Handle ESC key to close modal
  useEffect(() => {
    if (!show) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);

  return (
    <>
      <BackdropTransition show={show} duration={200}>
        <div 
          className="fixed inset-0 z-50 bg-black/80 pixel-border" 
          onClick={onClose}
        />
      </BackdropTransition>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <ModalTransition show={show} duration={300}>
          <div 
            className={cn(
              'border-4 pixel-border pointer-events-auto',
              'p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto max-h-[90vh] overflow-hidden flex flex-col',
              'shadow-[0_0_20px_rgba(62,124,172,0.4)]'
            )}
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button and mode filter */}
            <div 
              className="shrink-0 border-b-4 pixel-border p-4"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 
                  className="text-2xl sm:text-3xl font-bold text-foreground pixel-border px-4 py-2 inline-block"
                  style={{ borderColor: '#3E7CAC' }}
                >
                  {t(language, 'stats.title')}
                </h2>
                <button
                  onClick={onClose}
                  draggable={false}
                  className="px-4 py-2 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2 text-xs sm:text-sm"
                  style={{
                    borderColor: '#3E7CAC',
                    backgroundColor: '#3E7CAC',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3E7CAC';
                  }}
                  aria-label={t(language, 'settings.close')}
                >
                  {t(language, 'settings.close')}
                </button>
              </div>
              
              {/* Mode Filter Selector */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm sm:text-base md:text-lg font-semibold text-foreground/80">
                  {t(language, 'mode.select.title')}:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedMode(undefined)}
                    className={cn(
                      'px-3 py-1.5 text-sm sm:text-base font-semibold border-2 pixel-border transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary',
                      selectedMode === undefined
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-foreground/70 hover:text-foreground hover:bg-primary/20'
                    )}
                    style={{
                      borderColor: '#3E7CAC',
                    }}
                  >
                    {t(language, 'stats.filter.all')}
                  </button>
                  {modes.map((mode) => {
                    const isSelected = selectedMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={cn(
                          'px-3 py-1.5 text-sm sm:text-base font-semibold border-2 pixel-border transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-primary',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-transparent text-foreground/70 hover:text-foreground hover:bg-primary/20'
                        )}
                        style={{
                          borderColor: '#3E7CAC',
                        }}
                      >
                        {mode === 'reflex' && t(language, 'mode.reflex.name')}
                        {mode === 'sequence' && t(language, 'mode.sequence.name')}
                        {mode === 'survival' && t(language, 'mode.survival.name')}
                        {mode === 'nightmare' && t(language, 'mode.nightmare.name')}
                        {mode === 'oddOneOut' && t(language, 'mode.odd.name')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Statistics Hub Content */}
            <div className="min-h-0 overflow-hidden w-full flex flex-col">
              <StatisticsHub stats={filteredStats} gameMode={selectedMode} />
            </div>
          </div>
        </ModalTransition>
      </div>
    </>
  );
}

