'use client';

import { ChangeEvent, useState, useEffect } from 'react';
import { KeybindingsSettings } from '@/components/KeybindingsSettings';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n';
import { BackdropTransition, ModalTransition } from '@/components/Transition';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Unified SettingsModal - combines audio, keybinding, and comfort settings
 */
export function SettingsModal({ show, onClose }: SettingsModalProps) {
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
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'comfort'>('audio');
  const {
    language,
    setLanguage,
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

  const applyMobilePerformancePreset = () => {
    setReducedEffects(true);
    setScreenShakeEnabled(false);
    setScreenFlashEnabled(false);
  };

  const applyMobileVisualPreset = () => {
    setReducedEffects(true);
    setScreenShakeEnabled(true);
    setScreenFlashEnabled(false);
  };

  const restoreDesktopDefaults = () => {
    setReducedEffects(false);
    setScreenShakeEnabled(true);
    setScreenFlashEnabled(true);
  };

  const handleSoundVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) / 100;
    setSoundVolume(value);
  };

  const handleMusicVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) / 100;
    setMusicVolume(value);
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Language;
    if (SUPPORTED_LANGUAGES.includes(value)) {
      setLanguage(value);
    }
  };

  return (
    <BackdropTransition show={show} duration={200}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pixel-border" onClick={onClose}>
        <ModalTransition show={show} duration={250}>
          <div 
            className={cn(
              'border-4 pixel-border',
              'p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto',
              'shadow-[0_0_20px_rgba(62,124,172,0.4)]'
            )}
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-0 pixel-border px-4 py-2 inline-block">
            {t(language, 'settings.title')}
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Simple tab switcher */}
            <div className="inline-flex rounded-md border-2 overflow-hidden" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ' +
                  (activeTab === 'audio'
                    ? 'text-foreground'
                    : 'text-foreground/70 hover:text-foreground')
                }
                style={activeTab === 'audio' ? { backgroundColor: 'rgba(62, 124, 172, 0.3)' } : {}}
                onClick={() => setActiveTab('audio')}
              >
                {t(language, 'settings.tab.audio')}
              </button>
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold border-l transition-colors ' +
                  (activeTab === 'controls'
                    ? 'text-foreground'
                    : 'text-foreground/70 hover:text-foreground')
                }
                style={{
                  borderLeftColor: '#3E7CAC',
                  ...(activeTab === 'controls' ? { backgroundColor: 'rgba(62, 124, 172, 0.3)' } : {})
                }}
                onClick={() => setActiveTab('controls')}
              >
                {t(language, 'settings.tab.controls')}
              </button>
              <button
                type="button"
                className={
                  'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold border-l transition-colors ' +
                  (activeTab === 'comfort'
                    ? 'text-foreground'
                    : 'text-foreground/70 hover:text-foreground')
                }
                style={{
                  borderLeftColor: '#3E7CAC',
                  ...(activeTab === 'comfort' ? { backgroundColor: 'rgba(62, 124, 172, 0.3)' } : {})
                }}
                onClick={() => setActiveTab('comfort')}
              >
                {t(language, 'settings.tab.comfort')}
              </button>
            </div>

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
            >
              {t(language, 'settings.close')}
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'audio' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={toggleSound}
                draggable={false}
                className="w-full px-4 py-3 border-4 pixel-border font-bold text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2"
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
                {t(language, 'settings.audio.sound')} {soundEnabled ? t(language, 'settings.audio.soundOn') : t(language, 'settings.audio.soundOff')}
              </button>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-foreground/70">
                  <span>{t(language, 'settings.audio.soundVolume')}</span>
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
                className="w-full px-4 py-3 border-4 pixel-border font-bold text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2"
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
                {t(language, 'settings.audio.music')} {musicEnabled ? t(language, 'settings.audio.musicOn') : t(language, 'settings.audio.musicOff')}
              </button>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-foreground/70">
                  <span>{t(language, 'settings.audio.musicVolume')}</span>
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
                {t(language, 'settings.audio.musicNote')}
              </p>
            </div>
          </section>
        )}

        {activeTab === 'controls' && (
          <section className="space-y-4">
            {/* Directly render keybinding settings without extra inner borders */}
            <KeybindingsSettings onClose={onClose} embedded />
          </section>
        )}

        {activeTab === 'comfort' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <button
                type="button"
                className="w-full px-3 py-3 border-2 rounded text-left transition-colors font-semibold"
                style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }}
                onClick={applyMobilePerformancePreset}
              >
                <div className="text-sm sm:text-base">{t(language, 'settings.mobile.performance')}</div>
                <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.performance.desc')}</div>
              </button>
              <button
                type="button"
                className="w-full px-3 py-3 border-2 rounded text-left transition-colors font-semibold"
                style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }}
                onClick={applyMobileVisualPreset}
              >
                <div className="text-sm sm:text-base">{t(language, 'settings.mobile.visual')}</div>
                <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.visual.desc')}</div>
              </button>
              <button
                type="button"
                className="w-full px-3 py-3 border-2 rounded text-left transition-colors font-semibold sm:col-span-2"
                style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }}
                onClick={restoreDesktopDefaults}
              >
                <div className="text-sm sm:text-base">{t(language, 'settings.mobile.reset')}</div>
                <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.reset.desc')}</div>
              </button>
            </div>
            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <label className="flex items-start gap-2 cursor-pointer border-2 rounded px-3 py-2 transition-colors" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={screenShakeEnabled}
                  onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">{t(language, 'settings.comfort.screenShake')}</span>
                  <span className="block text-foreground/70">
                    {t(language, 'settings.comfort.screenShake.desc')}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border-2 rounded px-3 py-2 transition-colors" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={screenFlashEnabled}
                  onChange={(e) => setScreenFlashEnabled(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">{t(language, 'settings.comfort.screenFlash')}</span>
                  <span className="block text-foreground/70">
                    {t(language, 'settings.comfort.screenFlash.desc')}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border-2 rounded px-3 py-2 transition-colors" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={reducedEffects}
                  onChange={(e) => setReducedEffects(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">{t(language, 'settings.comfort.reducedEffects')}</span>
                  <span className="block text-foreground/70">
                    {t(language, 'settings.comfort.reducedEffects.desc')}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer border-2 rounded px-3 py-2 transition-colors" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">{t(language, 'settings.comfort.highContrast')}</span>
                  <span className="block text-foreground/70">
                    {t(language, 'settings.comfort.highContrast.desc')}
                  </span>
                </span>
              </label>

              <div className="border-2 rounded px-3 py-2 flex items-center justify-between transition-colors" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3E7CAC'; }}>
                <div>
                  <div className="font-semibold">Language / Sprache</div>
                  <div className="text-foreground/70">
                    Switch between English and German.
                  </div>
                </div>
                <select
                  className="ml-3 px-2 py-1 border border-border bg-background text-xs sm:text-sm"
                  value={language}
                  onChange={handleLanguageChange}
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </section>
        )}
          </div>
        </ModalTransition>
      </div>
    </BackdropTransition>
  );
}

export default SettingsModal;
