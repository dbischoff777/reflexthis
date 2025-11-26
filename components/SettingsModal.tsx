'use client';

import { ChangeEvent } from 'react';
import { KeybindingsSettings } from '@/components/KeybindingsSettings';
import { useGameState } from '@/lib/GameContext';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * Unified SettingsModal - combines audio and keybinding settings
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
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
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2 sm:mb-0 pixel-border px-4 py-2 inline-block">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            draggable={false}
            className="self-start sm:self-auto px-4 py-2 border-4 border-primary bg-primary text-primary-foreground pixel-border font-bold hover:bg-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            CLOSE
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Audio Settings */}
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2 pixel-border inline-block px-3 py-1">
                AUDIO
              </h3>
              <p className="text-xs text-foreground/70">
                Control sound effects and background music volumes.
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
                Music only plays during active games and will pause automatically when the game is paused.
              </p>
            </div>
          </section>

          {/* Keybindings Settings (embedded) */}
          <section>
            <KeybindingsSettings onClose={onClose} embedded />
          </section>
        </div>
      </div>
    </div>
  );
}


