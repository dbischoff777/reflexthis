'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  callout?: string;
};

interface TutorialOverlayProps {
  show: boolean;
  steps: TutorialStep[];
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
  title?: string;
}

export function TutorialOverlay({
  show,
  steps,
  stepIndex,
  onStepChange,
  onComplete,
  onSkip,
  onClose,
  title,
}: TutorialOverlayProps) {
  const { language } = useGameState();
  if (!show || !steps.length) return null;

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;
  const displayTitle = title || t(language, 'tutorial.title');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className="w-full max-w-2xl border-4 pixel-border rounded-xl p-4 sm:p-6 space-y-4"
        style={{
          borderColor: '#3E7CAC',
          backgroundColor: 'rgba(0, 58, 99, 0.8)',
          boxShadow: '0 0 28px rgba(62, 124, 172, 0.35)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/80">{t(language, 'tutorial.step')}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{displayTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border-2 pixel-border transition"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: 'rgba(62, 124, 172, 0.2)',
            }}
          >
            {t(language, 'tutorial.close')}
          </button>
        </div>

        <div
          className="border-2 pixel-border rounded-lg p-4 sm:p-5 space-y-2"
          style={{
            borderColor: '#3E7CAC',
            backgroundColor: 'rgba(0, 58, 99, 0.65)',
          }}
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t(language, 'tutorial.step')} {stepIndex + 1} / {steps.length}
          </p>
          <h3 className="text-xl sm:text-2xl font-semibold text-foreground">{step.title}</h3>
          <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{step.body}</p>
          {step.callout && (
            <div
              className="mt-2 text-sm font-semibold border-l-4 pl-3"
              style={{ borderColor: '#3E7CAC', color: '#3E7CAC' }}
            >
              {step.callout}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-2 text-sm border-2 pixel-border transition"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: 'rgba(62, 124, 172, 0.2)',
              }}
            >
              {t(language, 'tutorial.skip')}
            </button>
            <button
              onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
              className={cn('px-3 py-2 text-sm border-2 pixel-border transition', stepIndex === 0 ? 'opacity-50 cursor-not-allowed' : '')}
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: stepIndex === 0 ? 'rgba(62, 124, 172, 0.08)' : 'rgba(62, 124, 172, 0.2)',
              }}
            >
              {t(language, 'tutorial.back')}
            </button>
          </div>

          <button
            onClick={() => {
              if (isLast) onComplete();
              else onStepChange(stepIndex + 1);
            }}
            className="px-4 py-2 text-sm sm:text-base border-2 pixel-border font-bold transition"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#3E7CAC',
              color: '#ffffff',
            }}
          >
            {isLast ? t(language, 'tutorial.start') : t(language, 'tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  );
}

