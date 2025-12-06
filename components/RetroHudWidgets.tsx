'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { DifficultyPreset } from '@/lib/difficulty';
import type { GameMode } from '@/lib/gameModes';
import type { ReactionTimeStats } from '@/lib/GameContext';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';

type RetroHudWidgetsProps = {
  score: number;
  highScore: number;
  combo: number;
  lives: number;
  maxLives: number;
  difficulty: DifficultyPreset;
  gameMode: GameMode;
  reactionStats: ReactionTimeStats;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onQuit: () => void;
  onOpenSettings?: () => void;
};

const difficultyAccentMap: Record<DifficultyPreset, string> = {
  easy: '#00ff9f',
  medium: '#00f0ff',
  hard: '#ff00ff',
  nightmare: '#ff00ff',
};

const modeLabelMap: Record<GameMode, string> = {
  reflex: 'Reflex',
  sequence: 'Sequence',
  survival: 'Survival',
  nightmare: 'Nightmare',
  oddOneOut: 'Odd One Out',
};

export const RetroHudWidgets = memo(function RetroHudWidgets({
  score,
  highScore,
  combo,
  lives,
  maxLives,
  difficulty,
  gameMode,
  reactionStats,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  onQuit,
  onOpenSettings,
}: RetroHudWidgetsProps) {
  const { language } = useGameState();
  
  // Memoize expensive calculations
  const { comboIntensity, livesRatio, accent, gearDuration, ledColor, meterColor, formattedScore, formattedHighScore, tierValue } = useMemo(() => {
    const comboIntensity = Math.min(combo / 15, 1);
    const livesRatio = maxLives > 0 ? Math.max(0, Math.min(1, lives / maxLives)) : 1;
    const accent = difficultyAccentMap[difficulty] ?? '#ffff00';
    const gearDuration = `${Math.max(1.2, 2.5 - comboIntensity * 1.5)}s`;
    const meterColor = livesRatio > 0.4 ? '#00ffa7' : '#ff005d';
    const formattedScore = score.toString().padStart(6, '0');
    const formattedHighScore = highScore.toString().padStart(6, '0');
    const tierValue = Math.min(5, Math.max(1, Math.ceil(combo / 10)));
    
    return {
      comboIntensity,
      livesRatio,
      accent,
      gearDuration,
      ledColor: accent,
      meterColor,
      formattedScore,
      formattedHighScore,
      tierValue,
    };
  }, [combo, maxLives, lives, difficulty, score, highScore]);

  const getReactionLabel = (value: number | null) =>
    value !== null && value !== undefined ? `${Math.round(value)}ms` : '--';

  return (
    <div className="retro-hud flex flex-nowrap gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto scrollbar-hide mx-auto">
      <div className="flex flex-nowrap gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
        <div className="hud-module min-w-[8rem] sm:min-w-[9rem] md:min-w-[11rem] flex-shrink-0">
          <span className="hud-label">{t(language, 'hud.score.title')}</span>
          <div className="hud-readout">
            <span className="hud-readout-primary">{formattedScore}</span>
            <span className="hud-readout-sub">{t(language, 'hud.highScore')} {formattedHighScore}</span>
          </div>
        </div>

        <div className="hud-module min-w-[7rem] sm:min-w-[8rem] flex-shrink-0">
          <span className="hud-label">{t(language, 'hud.mode.title')}</span>
          <div className="hud-led" style={{ color: ledColor } as CSSProperties}>
            <span
              style={
                {
                  backgroundColor: ledColor,
                  filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))',
                } as CSSProperties
              }
            />
            {gameMode === 'reflex' && t(language, 'mode.reflex.name')}
            {gameMode === 'sequence' && t(language, 'mode.sequence.name')}
            {gameMode === 'survival' && t(language, 'mode.survival.name')}
            {gameMode === 'nightmare' && t(language, 'mode.nightmare.name')}
            {gameMode === 'oddOneOut' && t(language, 'mode.odd.name')}
          </div>
          <div className="hud-difficulty">
            <span className="hud-label text-[0.55rem]">
              {t(language, 'hud.diff.label')}
            </span>
            <span className="hud-difficulty-chip">{difficulty.toUpperCase()}</span>
          </div>
        </div>

        <div className="hud-module min-w-[7rem] sm:min-w-[8rem] flex-shrink-0">
          <span className="hud-label">{t(language, 'hud.combo.title')}</span>
          <div
            className="hud-gear"
            style={
              {
                animation: `hud-gear-spin ${gearDuration} linear infinite`,
                borderColor: accent,
              } as CSSProperties
            }
          />
          <span className="text-xs uppercase tracking-wide">
            {t(language, 'hud.combo.tier')} {tierValue} / {t(language, 'hud.combo.combo')} {combo}
          </span>
        </div>
      </div>

      <div className="hud-module min-w-[8rem] sm:min-w-[9rem] md:min-w-[12rem] flex-shrink-0">
        <span className="hud-label">{t(language, 'hud.vitals.title')}</span>
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
        <div className="flex justify-between text-[0.65rem] uppercase tracking-wide mt-1">
          <span>{lives} / {maxLives || 1} {t(language, 'hud.lives')}</span>
          <span>{t(language, 'hud.hp')} {(livesRatio * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="hud-module min-w-[9rem] sm:min-w-[11rem] md:min-w-[14rem] flex-shrink-0">
        <span className="hud-label">{t(language, 'hud.reaction.title')}</span>
        <div className="hud-reaction-grid">
          <div>
            <span className="hud-reaction-label">
              {t(language, 'hud.reaction.now')}
            </span>
            <span className="hud-reaction-value">{getReactionLabel(reactionStats.current)}</span>
          </div>
          <div>
            <span className="hud-reaction-label">
              {t(language, 'hud.reaction.avg')}
            </span>
            <span className="hud-reaction-value">{getReactionLabel(reactionStats.average)}</span>
          </div>
          <div>
            <span className="hud-reaction-label">
              {t(language, 'hud.reaction.fast')}
            </span>
            <span className="hud-reaction-value">{getReactionLabel(reactionStats.fastest)}</span>
          </div>
        </div>
      </div>

      <div className="hud-module min-w-[8rem] sm:min-w-[10rem] md:min-w-[13rem] flex-shrink-0">
        <span className="hud-label">{t(language, 'hud.controls.title')}</span>
        <div className="hud-control-grid">
          <button
            className="hud-control-button"
            onClick={onToggleSound}
            draggable={false}
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            <span
              className="hud-control-indicator"
              data-active={soundEnabled ? 'true' : 'false'}
            />
            <span className="text-lg leading-none">🔊</span>
          </button>
          <button
            className="hud-control-button"
            onClick={onToggleMusic}
            draggable={false}
            aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
          >
            <span
              className="hud-control-indicator"
              data-active={musicEnabled ? 'true' : 'false'}
            />
            <span className="text-lg leading-none">🎵</span>
          </button>
          {onOpenSettings && (
            <button
              className="hud-control-button"
              onClick={onOpenSettings}
              draggable={false}
              aria-label="Open settings"
            >
              <span className="hud-control-indicator" data-active="false" />
              <span className="text-lg leading-none">⚙</span>
            </button>
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
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.score === nextProps.score &&
    prevProps.highScore === nextProps.highScore &&
    prevProps.combo === nextProps.combo &&
    prevProps.lives === nextProps.lives &&
    prevProps.maxLives === nextProps.maxLives &&
    prevProps.difficulty === nextProps.difficulty &&
    prevProps.gameMode === nextProps.gameMode &&
    prevProps.soundEnabled === nextProps.soundEnabled &&
    prevProps.musicEnabled === nextProps.musicEnabled &&
    prevProps.reactionStats.current === nextProps.reactionStats.current &&
    prevProps.reactionStats.average === nextProps.reactionStats.average &&
    prevProps.reactionStats.fastest === nextProps.reactionStats.fastest
  );
});

