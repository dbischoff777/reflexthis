'use client';

import { memo, useMemo, useEffect, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { DifficultyPreset } from '@/lib/difficulty';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import type { ScoringFactors } from '@/lib/scoring';
import { FadeTransition } from '@/components/Transition';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type RetroHudWidgetsProps = {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  difficulty: DifficultyPreset;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onQuit: () => void;
  onOpenSettings?: () => void;
  scoreBreakdown?: ScoringFactors | null;
  comboShieldAvailable?: boolean;
  reviveAvailable?: boolean;
  gameMode?: string;
};

type LayoutMode = 'standard' | 'compact' | 'minimal';
type SectionId = 'score' | 'vitals' | 'controls';

const difficultyAccentMap: Record<DifficultyPreset, string> = {
  easy: '#00ff9f',
  medium: '#00f0ff',
  hard: '#ff00ff',
  nightmare: '#ff00ff',
};


export const RetroHudWidgets = memo(function RetroHudWidgets({
  score,
  highScore,
  lives,
  maxLives,
  difficulty,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  onQuit,
  onOpenSettings,
  scoreBreakdown,
  comboShieldAvailable = false,
  reviveAvailable = false,
  gameMode,
}: RetroHudWidgetsProps) {
  const { language } = useGameState();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [animatedBreakdown, setAnimatedBreakdown] = useState<ScoringFactors | null>(null);
  const breakdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
  const [hudHidden, setHudHidden] = useState(false);
  const collapsed: Record<SectionId, boolean> = {
    score: false,
    vitals: false,
    controls: false,
  };
  
  // Memoize expensive calculations
  const { livesRatio, accent, meterColor } = useMemo(() => {
    const livesRatio = maxLives > 0 ? Math.max(0, Math.min(1, lives / maxLives)) : 1;
    const accent = difficultyAccentMap[difficulty] ?? '#ffff00';
    const meterColor = livesRatio > 0.4 ? '#00ffa7' : '#ff005d';
    
    return {
      livesRatio,
      accent,
      meterColor,
    };
  }, [maxLives, lives, difficulty]);

  // Handle score breakdown display
  useEffect(() => {
    // Clear any existing timeouts
    if (breakdownTimeoutRef.current) {
      clearTimeout(breakdownTimeoutRef.current);
      breakdownTimeoutRef.current = null;
    }

    let animationTimeouts: NodeJS.Timeout[] = [];
    let isCancelled = false;

    if (scoreBreakdown && scoreBreakdown.totalScore > 0) {
      setShowBreakdown(true);
      
      // Animate values from 0 to target
      const duration = 600; // 600ms animation
      const steps = 20;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const animate = () => {
        if (isCancelled) return;
        
        if (currentStep >= steps) {
          setAnimatedBreakdown(scoreBreakdown);
          // Hide after showing for 2 seconds
          breakdownTimeoutRef.current = setTimeout(() => {
            if (!isCancelled) {
              setShowBreakdown(false);
              setAnimatedBreakdown(null);
            }
            breakdownTimeoutRef.current = null;
          }, 2000);
          return;
        }

        const progress = currentStep / steps;
        // Ease-out animation
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedBreakdown({
          baseScore: Math.round(scoreBreakdown.baseScore * eased),
          comboMultiplier: Math.round(scoreBreakdown.comboMultiplier * 10) / 10,
          accuracyBonus: Math.round(scoreBreakdown.accuracyBonus * eased),
          consistencyBonus: Math.round(scoreBreakdown.consistencyBonus * eased),
          difficultyMultiplier: Math.round(scoreBreakdown.difficultyMultiplier * 10) / 10,
          modeMultiplier: Math.round(scoreBreakdown.modeMultiplier * 10) / 10,
          totalScore: Math.round(scoreBreakdown.totalScore * eased),
        });

        currentStep++;
        const timeoutId = setTimeout(animate, stepDuration);
        animationTimeouts.push(timeoutId);
      };

      animate();
    } else {
      setShowBreakdown(false);
      setAnimatedBreakdown(null);
    }

    // Cleanup function
    return () => {
      isCancelled = true;
      if (breakdownTimeoutRef.current) {
        clearTimeout(breakdownTimeoutRef.current);
        breakdownTimeoutRef.current = null;
      }
      animationTimeouts.forEach(timeout => clearTimeout(timeout));
      animationTimeouts = [];
    };
  }, [scoreBreakdown]);

  // Persist layout preferences (simple localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applyFromStorage = () => {
      const savedLayout = window.localStorage.getItem('rt_hud_layout') as LayoutMode | null;
      const savedHidden = window.localStorage.getItem('rt_hud_hidden');
      if (savedLayout) setLayoutMode(savedLayout);
      setHudHidden(savedHidden === 'true');
    };

    applyFromStorage();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rt_hud_layout' || e.key === 'rt_hud_hidden') {
        applyFromStorage();
      }
    };
    const handleCustom = () => applyFromStorage();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('rt_hud_layout_change', handleCustom as EventListener);
    window.addEventListener('rt_hud_visibility_change', handleCustom as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('rt_hud_layout_change', handleCustom as EventListener);
      window.removeEventListener('rt_hud_visibility_change', handleCustom as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('rt_hud_layout', layoutMode);
    window.localStorage.setItem('rt_hud_hidden', hudHidden ? 'true' : 'false');
  }, [layoutMode, hudHidden]);

  const moduleClass = (_id: SectionId, extra?: string) => {
    const classes = ['hud-module'];
    if (layoutMode === 'compact') classes.push('hud-module-compact');
    if (layoutMode === 'minimal') classes.push('hud-module-minimal');
    if (extra) classes.push(extra);
    return classes.join(' ');
  };

  const unhideHud = () => {
    setHudHidden(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rt_hud_hidden', 'false');
      window.dispatchEvent(new Event('rt_hud_visibility_change'));
    }
  };

  // When HUD is hidden, surface a quick toggle to bring it back
  if (hudHidden) {
    return (
      <FadeTransition show={true} duration={300}>
        <div className="w-full flex justify-end items-center gap-2">
          <span className="text-xs sm:text-sm text-foreground/70 hidden sm:inline">{t(language, 'hud.hidden')}</span>
          <button
            className="hud-control-button"
            onClick={unhideHud}
            aria-label={t(language, 'hud.show')}
            title={t(language, 'hud.show')}
          >
            <span className="hud-control-indicator" data-active="false" />
            <span className="text-sm leading-none">{t(language, 'hud.show')}</span>
          </button>
        </div>
      </FadeTransition>
    );
  }

  // Temporarily disable in-HUD score breakdown display
  const allowBreakdown = false;
  const renderControlsCompact = layoutMode === 'minimal';

  return (
    <FadeTransition show={!hudHidden} duration={300}>
      <div
        className="retro-hud transition-all duration-300 ease-in-out"
        data-layout={layoutMode}
        data-alert={livesRatio < 0.35 ? 'low-health' : undefined}
      >
      <div className="hud-grid">
        {/* Score Display - Total and Best */}
        <section className={moduleClass('score')}>
          <header className="hud-section-header">
            <span className="hud-label">{t(language, 'hud.score.title')}</span>
            <div className="hud-section-tools">
              {allowBreakdown && showBreakdown && animatedBreakdown && (
                <span className="hud-badge subtle">+{Math.round(animatedBreakdown.totalScore)}</span>
              )}
            </div>
          </header>

          <div className="hud-section-body">
            <div className="hud-readout">
              <span className="hud-readout-primary">
                <AnimatedNumber
                  value={score}
                  duration={600}
                  formatValue={(v) => Math.round(v).toString().padStart(6, '0')}
                />
              </span>
              <span className="hud-readout-sub">
                {t(language, 'hud.highScore')}{' '}
                <AnimatedNumber
                  value={highScore}
                  duration={600}
                  formatValue={(v) => Math.round(v).toString().padStart(6, '0')}
                />
              </span>
            </div>

            {allowBreakdown && showBreakdown && animatedBreakdown && (
              <div className="hud-breakdown">
                <div className="hud-breakdown-row">
                  <span>Base</span>
                  <span>{Math.round(animatedBreakdown.baseScore)}</span>
                </div>
                {(Math.round(animatedBreakdown.comboMultiplier * 10) / 10 > 1 ||
                  Math.round(animatedBreakdown.difficultyMultiplier * 10) / 10 !== 1 ||
                  Math.round(animatedBreakdown.modeMultiplier * 10) / 10 !== 1) && (
                  <>
                    {Math.round(animatedBreakdown.comboMultiplier * 10) / 10 > 1 && (
                      <div className="hud-breakdown-row">
                        <span>Combo</span>
                        <span>{Math.round(animatedBreakdown.comboMultiplier)}x</span>
                      </div>
                    )}
                    {Math.round(animatedBreakdown.difficultyMultiplier * 10) / 10 !== 1 && (
                      <div className="hud-breakdown-row">
                        <span>Diff</span>
                        <span>{Math.round(animatedBreakdown.difficultyMultiplier)}x</span>
                      </div>
                    )}
                    {Math.round(animatedBreakdown.modeMultiplier * 10) / 10 !== 1 && (
                      <div className="hud-breakdown-row">
                        <span>Mode</span>
                        <span>{Math.round(animatedBreakdown.modeMultiplier)}x</span>
                      </div>
                    )}
                  </>
                )}
                {(Math.round(animatedBreakdown.accuracyBonus) > 0 ||
                  Math.round(animatedBreakdown.consistencyBonus) > 0) && (
                  <>
                    {Math.round(animatedBreakdown.accuracyBonus) > 0 && (
                      <div className="hud-breakdown-row">
                        <span>Perfect</span>
                        <span>+{Math.round(animatedBreakdown.accuracyBonus)}</span>
                      </div>
                    )}
                    {Math.round(animatedBreakdown.consistencyBonus) > 0 && (
                      <div className="hud-breakdown-row">
                        <span>Consist</span>
                        <span>+{Math.round(animatedBreakdown.consistencyBonus)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Vitals */}
        <section
          className={moduleClass(
            'vitals',
            livesRatio < 0.35 ? 'hud-emphasis danger' : livesRatio < 0.6 ? 'hud-emphasis warn' : ''
          )}
        >
          <header className="hud-section-header">
            <span className="hud-label">{t(language, 'hud.vitals.title')}</span>
            <div className="hud-section-tools">
              <span className="hud-badge subtle">
                <AnimatedNumber
                  value={livesRatio * 100}
                  duration={400}
                  formatValue={(v) => `${Math.round(v)}%`}
                />
              </span>
            </div>
          </header>

          <div className="hud-section-body">
            <div className="hud-meter">
              <div
                className="hud-meter-fill"
                style={
                  {
                    width: `${livesRatio * 100}%`,
                    background: `linear-gradient(90deg, ${meterColor}, ${accent})`,
                  } as CSSProperties
                }
              />
            </div>
            <div className="flex justify-between text-[0.85rem] uppercase tracking-wide mt-1">
              <span>
                <AnimatedNumber
                  value={lives}
                  duration={400}
                  formatValue={(v) => Math.round(v).toString()}
                />
                {' / '}
                <AnimatedNumber
                  value={maxLives || 1}
                  duration={400}
                  formatValue={(v) => Math.round(v).toString()}
                />
                {' '}
                {t(language, 'hud.lives')}
              </span>
              <span>
                {t(language, 'hud.hp')}{' '}
                <AnimatedNumber
                  value={livesRatio * 100}
                  duration={400}
                  formatValue={(v) => `${Math.round(v)}%`}
                />
              </span>
            </div>
            
            {/* Survival Mode Protection Indicators */}
            {gameMode === 'survival' && (comboShieldAvailable || reviveAvailable) && (
              <div className="mt-2 flex flex-col gap-1.5">
                {/* Combo Shield Indicator */}
                {comboShieldAvailable && (
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded border-2 pixel-border"
                    style={{
                      backgroundColor: 'rgba(0, 255, 255, 0.15)',
                      borderColor: '#00f0ff',
                      boxShadow: '0 0 12px rgba(0, 240, 255, 0.5)',
                      animation: 'shield-pulse 2s ease-in-out infinite',
                    }}
                  >
                    <span className="text-lg leading-none" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }}>
                      🛡️
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#00f0ff', textShadow: '0 0 6px #00f0ff' }}>
                      Shield Active
                    </span>
                  </div>
                )}
                
                {/* Revive Available Indicator */}
                {reviveAvailable && (
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded border-2 pixel-border"
                    style={{
                      backgroundColor: 'rgba(0, 255, 159, 0.15)',
                      borderColor: '#00ff9f',
                      boxShadow: '0 0 12px rgba(0, 255, 159, 0.5)',
                      animation: 'revive-pulse 2s ease-in-out infinite',
                    }}
                  >
                    <span className="text-lg leading-none" style={{ filter: 'drop-shadow(0 0 4px #00ff9f)' }}>
                      ⚡
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#00ff9f', textShadow: '0 0 6px #00ff9f' }}>
                      Second Chance Ready
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Controls */}
        <section
          className={moduleClass(
            'controls',
            (!soundEnabled || !musicEnabled) && !collapsed.controls ? 'hud-emphasis info' : ''
          )}
        >
          {!collapsed.controls && (
            <div className="hud-section-body">
              {renderControlsCompact ? (
                <div className="flex gap-2 text-sm">
                  <button className="hud-control-button" onClick={onToggleSound} aria-label="Toggle sound" data-active={soundEnabled}>
                    🔊
                  </button>
                  <button className="hud-control-button" onClick={onToggleMusic} aria-label="Toggle music" data-active={musicEnabled}>
                    🎵
                  </button>
                  {onOpenSettings && (
                    <button className="hud-control-button" onClick={onOpenSettings} aria-label="Open settings">
                      ⚙
                    </button>
                  )}
                  <button className="hud-control-button danger" onClick={onQuit} aria-label="Quit game">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="hud-control-grid-2x2">
                  <button
                    className="hud-control-button"
                    onClick={onToggleSound}
                    draggable={false}
                    aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
                    data-active={soundEnabled}
                  >
                    <span className="hud-control-indicator" data-active={soundEnabled ? 'true' : 'false'} />
                    <span className="text-lg leading-none">🔊</span>
                  </button>
                  <button
                    className="hud-control-button"
                    onClick={onToggleMusic}
                    draggable={false}
                    aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
                    data-active={musicEnabled}
                  >
                    <span className="hud-control-indicator" data-active={musicEnabled ? 'true' : 'false'} />
                    <span className="text-lg leading-none">🎵</span>
                  </button>
                  {onOpenSettings ? (
                    <button
                      className="hud-control-button"
                      onClick={onOpenSettings}
                      draggable={false}
                      aria-label="Open settings"
                    >
                      <span className="hud-control-indicator" data-active="false" />
                      <span className="text-lg leading-none">⚙</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    className="hud-control-button danger"
                    onClick={onQuit}
                    draggable={false}
                    aria-label="Quit game"
                  >
                    <span className="hud-control-indicator" data-active="true" />
                    <span>{t(language, 'hud.controls.exit')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
    </FadeTransition>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.score === nextProps.score &&
    prevProps.highScore === nextProps.highScore &&
    prevProps.lives === nextProps.lives &&
    prevProps.maxLives === nextProps.maxLives &&
    prevProps.difficulty === nextProps.difficulty &&
    prevProps.soundEnabled === nextProps.soundEnabled &&
    prevProps.musicEnabled === nextProps.musicEnabled &&
    prevProps.scoreBreakdown === nextProps.scoreBreakdown &&
    prevProps.comboShieldAvailable === nextProps.comboShieldAvailable &&
    prevProps.reviveAvailable === nextProps.reviveAvailable &&
    prevProps.gameMode === nextProps.gameMode
  );
});

