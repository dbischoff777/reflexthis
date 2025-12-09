'use client';

import { t, type Language } from '@/lib/i18n';

interface PauseModalProps {
  show: boolean;
  language: Language;
  onContinue: () => void;
  onExit: () => void;
}

export function PauseModal({ show, language, onContinue, onExit }: PauseModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
      <div 
        className="border-4 pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_20px_rgba(62,124,172,0.4)]"
        style={{
          borderColor: '#3E7CAC',
          backgroundColor: '#003A63',
        }}
      >
        <h2 
          className="text-2xl sm:text-3xl font-bold text-foreground mb-4 pixel-border px-4 py-2 inline-block"
          style={{ borderColor: '#3E7CAC' }}
        >
          {t(language, 'pause.title')}
        </h2>
        <p className="text-sm text-foreground/80 mb-6">
          {t(language, 'pause.message')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onContinue}
            className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
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
          >
            {t(language, 'pause.continue')}
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: 'rgba(0, 58, 99, 0.6)',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
            }}
          >
            {t(language, 'pause.exit')}
          </button>
        </div>
      </div>
    </div>
  );
}

