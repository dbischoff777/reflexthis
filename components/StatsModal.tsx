'use client';

import { useEffect } from 'react';
import { BackdropTransition, ModalTransition } from '@/components/Transition';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { SessionStatistics, calculateSessionStatisticsFromSessions, getGameSessions } from '@/lib/sessionStats';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { GameMode } from '@/lib/gameModes';

interface StatsModalProps {
  show: boolean;
  stats: SessionStatistics;
  onClose: () => void;
  gameMode?: GameMode;
}

/**
 * StatsModal - Modal wrapper for SessionStatsDisplay with transitions and ESC key support
 */
export function StatsModal({ show, stats, onClose, gameMode }: StatsModalProps) {
  const { language } = useGameState();
  
  // Filter stats by game mode if provided
  const filteredStats = gameMode 
    ? (() => {
        const allSessions = getGameSessions();
        const modeSessions = allSessions.filter(s => s.gameMode === gameMode);
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
    <BackdropTransition show={show} duration={200}>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pixel-border p-4"
        onClick={onClose}
      >
        <ModalTransition show={show} duration={250}>
          <div 
            className={cn(
              'border-4 pixel-border',
              'max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
              'shadow-[0_0_20px_rgba(62,124,172,0.4)]'
            )}
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div 
              className="shrink-0 border-b-4 pixel-border p-4 flex items-center justify-between"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
            >
              <h2 
                className="text-2xl sm:text-3xl font-bold text-foreground pixel-border px-4 py-2 inline-block"
                style={{ borderColor: '#3E7CAC' }}
              >
                {gameMode 
                  ? `${t(language, 'stats.title')} - ${gameMode === 'reflex' ? t(language, 'mode.reflex.name') : gameMode === 'sequence' ? t(language, 'mode.sequence.name') : gameMode === 'survival' ? t(language, 'mode.survival.name') : gameMode === 'nightmare' ? t(language, 'mode.nightmare.name') : t(language, 'mode.odd.name')}`
                  : t(language, 'stats.title')
                }
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

            {/* Stats Content - Remove title since modal header has it */}
            <div className="p-4 sm:p-6 min-h-0 overflow-y-auto w-full">
              <SessionStatsDisplay stats={filteredStats} hideTitle gameMode={gameMode} />
            </div>
          </div>
        </ModalTransition>
      </div>
    </BackdropTransition>
  );
}

