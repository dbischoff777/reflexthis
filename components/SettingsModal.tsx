'use client';

import { ChangeEvent, useState } from 'react';
import { KeybindingsSettings } from '@/components/KeybindingsSettings';
import { useGameState } from '@/lib/GameContext';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * Unified SettingsModal - combines audio, keybinding, and comfort settings
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'comfort'>('audio');
  const {
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    screenShakeEnabled,
    screenFlashEnabled,
    reducedEffects,
    highContrastMode,
    setScreenShakeEnabled,
    setScreenFlashEnabled,
    setReducedEffects,
    setHighContrastMode,
  } = useGameState();

  const handleSoundVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) / 100;
    setSoundVolume(value);
  };

  const handleMusicVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) / 100;
    setMusicVolume(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pixel-border">
      <div className="bg-card border-4 border-primary pixel-border p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-0 pixel-border px-4 py-2 inline-block">
            SETTINGS
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Simple tab switcher */}
            <div className="inline-flex rounded-md border-2 border-border bg-background/80 overflow-hidden">
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ' +
                  (activeTab === 'audio'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-primary/10')
                }
                onClick={() => setActiveTab('audio')}
              >
                Audio
              </button>
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold border-l border-border transition-colors ' +
                  (activeTab === 'controls'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-primary/10')
                }
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </button>
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold border-l border-border transition-colors ' +
                  (activeTab === 'comfort'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-primary/10')
                }
                onClick={() => setActiveTab('comfort')}
              >
                Comfort
              </button>
            </div>

            <button
              onClick={onClose}
              draggable={false}
              className="px-4 py-2 border-4 border-primary bg-primary text-primary-foreground pixel-border font-bold hover:bg-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'audio' && (
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2 pixel-border inline-block px-3 py-1">
                AUDIO
              </h3>
              <p className="text-xs text-foreground/70">
                Quick control over sound effects and background music.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={toggleSound}
                draggable={false}
                className="w-full px-4 py-3 border-4 pixel-border font-bold text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
                  bg-card border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                SOUND: {soundEnabled ? 'ON' : 'OFF'}
              </button>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-foreground/70">
                  <span>Sound volume</span>
                  <span>{Math.round(soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(soundVolume * 100)}
                  onChange={handleSoundVolumeChange}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <button
                onClick={toggleMusic}
                draggable={false}
                className="w-full px-4 py-3 border-4 pixel-border font-bold text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
                  bg-card border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                MUSIC: {musicEnabled ? 'ON' : 'OFF'}
              </button>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-foreground/70">
                  <span>Music volume</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(musicVolume * 100)}
                  onChange={handleMusicVolumeChange}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <p className="text-xs text-foreground/60 mt-1">
                Affects both menu and in-game music. Game music pauses automatically when the game is paused.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'controls' && (
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2 pixel-border inline-block px-3 py-1">
                CONTROLS
              </h3>
              <p className="text-xs text-foreground/70">
                Change which keys you use to hit the grid.
              </p>
            </div>

            <div className="border-2 border-border bg-card/80 pixel-border p-3 sm:p-4">
              <KeybindingsSettings onClose={onClose} embedded />
            </div>
          </section>
        )}

        {activeTab === 'comfort' && (
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2 pixel-border inline-block px-3 py-1">
                COMFORT & ACCESSIBILITY
              </h3>
              <p className="text-xs text-foreground/70">
                Tone down motion and flashes if things feel too intense.
              </p>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <label className="flex items-start gap-2 cursor-pointer border border-border bg-card/80 rounded px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={screenShakeEnabled}
                  onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Screen shake</span>
                  <span className="block text-foreground/70">
                    Disable camera movement if it feels uncomfortable.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border border-border bg-card/80 rounded px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={screenFlashEnabled}
                  onChange={(e) => setScreenFlashEnabled(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Screen flash</span>
                  <span className="block text-foreground/70">
                    Turn full-screen flashes for hits and errors on or off.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border border-border bg-card/80 rounded px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={reducedEffects}
                  onChange={(e) => setReducedEffects(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Reduced effects</span>
                  <span className="block text-foreground/70">
                    Use shorter flashes and less motion for a calmer experience.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border border-border bg-card/80 rounded px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">High-contrast flashes</span>
                  <span className="block text-foreground/70">
                    Make success and error flashes more pronounced for visibility.
                  </span>
                </span>
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default SettingsModal;
