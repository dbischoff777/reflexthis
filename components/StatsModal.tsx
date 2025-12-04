'use client';

import { useEffect } from 'react';
import { BackdropTransition, ModalTransition } from '@/components/Transition';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { SessionStatistics } from '@/lib/sessionStats';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface StatsModalProps {
  show: boolean;
  stats: SessionStatistics;
  onClose: () => void;
}

/**
 * StatsModal - Modal wrapper for SessionStatsDisplay with transitions and ESC key support
 */
export function StatsModal({ show, stats, onClose }: StatsModalProps) {
  const { language } = useGameState();

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
              'bg-card border-4 border-primary pixel-border',
              'max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
              'shadow-[0_0_20px_rgba(0,255,255,0.3)]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="shrink-0 bg-card border-b-4 border-primary pixel-border p-4 flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary pixel-border px-4 py-2 inline-block">
                {t(language, 'stats.title')}
              </h2>
              <button
                onClick={onClose}
                draggable={false}
                className="px-4 py-2 border-4 border-primary bg-primary text-primary-foreground pixel-border font-bold hover:bg-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                aria-label={t(language, 'settings.close')}
              >
                {t(language, 'settings.close')}
              </button>
            </div>

            {/* Stats Content - Remove title since modal header has it */}
            <div className="p-4 sm:p-6 min-h-0 overflow-y-auto overflow-x-hidden">
              <SessionStatsDisplay stats={stats} hideTitle />
            </div>
          </div>
        </ModalTransition>
      </div>
    </BackdropTransition>
  );
}

