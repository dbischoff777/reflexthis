'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

interface ReadyScreenProps {
  onReady: () => void;
  gameMode?: string;
}

/**
 * ReadyScreen component
 * - Always shows tutorial content (controls + how to play well)
 * - Auto-starts the game after 3 seconds
 */
export function ReadyScreen({ onReady, gameMode }: ReadyScreenProps) {
  const { language } = useGameState();
  
  // Game starts immediately when loading screen reaches 100%
  // This component is shown briefly for visual feedback only

  const getModeName = () => {
    if (gameMode === 'reflex') return t(language, 'mode.reflex.name').toUpperCase();
    if (gameMode === 'sequence') return t(language, 'mode.sequence.name').toUpperCase();
    if (gameMode === 'survival') return t(language, 'mode.survival.name').toUpperCase();
    if (gameMode === 'nightmare') return t(language, 'mode.nightmare.name').toUpperCase();
    if (gameMode === 'oddOneOut') return t(language, 'mode.odd.name').toUpperCase();
    return 'GAME';
  };

  const getModeDescription = () => {
    switch (gameMode) {
      case 'reflex': return t(language, 'ready.reflex.desc');
      case 'sequence': return t(language, 'ready.sequence.desc');
      case 'survival': return t(language, 'ready.survival.desc');
      case 'nightmare': return t(language, 'ready.nightmare.desc');
      case 'oddOneOut': return t(language, 'ready.odd.desc');
      default: return t(language, 'ready.default.desc');
    }
  };

  const getModeTips = () => {
    switch (gameMode) {
      case 'reflex':
        return [
          { icon: '⚡', text: t(language, 'ready.tip.reflex.1'), color: 'border-primary/50' },
          { icon: '⭐', text: t(language, 'ready.tip.reflex.2'), color: 'border-yellow-500/50' },
          { icon: '🔥', text: t(language, 'ready.tip.reflex.3'), color: 'border-secondary/50' },
        ];
      case 'sequence':
        return [
          { icon: '👁️', text: t(language, 'ready.tip.sequence.1'), color: 'border-primary/50' },
          { icon: '🧠', text: t(language, 'ready.tip.sequence.2'), color: 'border-chart-3/50' },
          { icon: '⏱️', text: t(language, 'ready.tip.sequence.3'), color: 'border-secondary/50' },
        ];
      case 'survival':
        return [
          { icon: '💀', text: t(language, 'ready.tip.survival.1'), color: 'border-destructive/50' },
          { icon: '⚡', text: t(language, 'ready.tip.survival.2'), color: 'border-primary/50' },
          { icon: '⭐', text: t(language, 'ready.tip.survival.3'), color: 'border-yellow-500/50' },
        ];
      case 'nightmare':
        return [
          { icon: '🔥', text: t(language, 'ready.tip.nightmare.1'), color: 'border-destructive/50' },
          { icon: '⚡', text: t(language, 'ready.tip.nightmare.2'), color: 'border-primary/50' },
          { icon: '⏱️', text: t(language, 'ready.tip.nightmare.3'), color: 'border-secondary/50' },
        ];
      case 'oddOneOut':
        return [
          { icon: '🎯', text: t(language, 'ready.tip.odd.1'), color: 'border-secondary/50' },
          { icon: '❌', text: t(language, 'ready.tip.odd.2'), color: 'border-primary/50' },
          { icon: '⚡', text: t(language, 'ready.tip.odd.3'), color: 'border-chart-3/50' },
        ];
      default:
        return [
          { icon: '⚡', text: t(language, 'ready.tip.default.1'), color: 'border-primary/50' },
          { icon: '✓', text: t(language, 'ready.tip.default.2'), color: 'border-chart-3/50' },
          { icon: '🔥', text: t(language, 'ready.tip.default.3'), color: 'border-secondary/50' },
        ];
    }
  };

  const renderTutorialContent = () => {
    const tips = getModeTips();
    
    return (
      <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto text-center">
        {/* Title + Mode - Enhanced visibility */}
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-primary text-glow">
            {getModeName()}
          </h1>
          <p className="text-2xl sm:text-3xl md:text-4xl text-foreground font-semibold" style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 255, 255, 0.4)',
          }}>
            {getModeDescription()}
          </p>
        </div>

        {/* Mode-specific tips - concise and essential - Enhanced visibility */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-lg sm:text-xl md:text-2xl">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 bg-card/85 border-3 rounded shadow-[0_0_15px_rgba(0,255,255,0.3)]',
                tip.color
              )}
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <span className="font-bold text-2xl">{tip.icon}</span>
              <span className="font-semibold">{tip.text}</span>
            </div>
          ))}
        </div>

        {/* Keyboard layout - Enhanced visibility */}
        <div className="inline-block bg-card/75 border-3 border-border rounded-xl px-8 py-6 shadow-[0_0_20px_rgba(0,255,255,0.3)]" style={{
          backdropFilter: 'blur(4px)',
        }}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2.5">
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>Q</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>W</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>E</kbd>
            </div>
            <div className="flex gap-2.5">
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>A</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>S</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>D</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>F</kbd>
            </div>
            <div className="flex gap-2.5">
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>Y</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>X</kbd>
              <kbd className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-border bg-background/90 text-lg sm:text-xl font-bold rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}>C</kbd>
            </div>
          </div>
          <p className="mt-4 text-base sm:text-lg text-foreground font-medium" style={{
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          }}>
            {t(language, 'ready.customize')}
          </p>
        </div>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-8 py-4 sm:py-8 overflow-hidden">
        <div className="relative z-10 w-full max-w-3xl">
          {renderTutorialContent()}
        </div>

        {/* Subtle animated border */}
        <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-primary/20 rounded-xl" />
      </div>
    </div>
  );
}


