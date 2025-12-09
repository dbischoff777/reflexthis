'use client';

import { ChangeEvent, useState, useEffect } from 'react';
import { KeybindingsSettings } from '@/components/KeybindingsSettings';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n';
import { BackdropTransition, ModalTransition } from '@/components/Transition';
import { cn } from '@/lib/utils';
import { RippleButton } from '@/components/RippleButton';

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

  const [hudLayout, setHudLayout] = useState<'standard' | 'compact' | 'minimal'>(() => {
    if (typeof window === 'undefined') return 'standard';
    return (window.localStorage.getItem('rt_hud_layout') as 'standard' | 'compact' | 'minimal') || 'standard';
  });

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

  const updateHudLayout = (layout: 'standard' | 'compact' | 'minimal') => {
    setHudLayout(layout);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rt_hud_layout', layout);
      window.dispatchEvent(new Event('rt_hud_layout_change'));
    }
  };

  const [hudHidden, setHudHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('rt_hud_hidden') === 'true';
  });

  const toggleHudHidden = (hidden: boolean) => {
    setHudHidden(hidden);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rt_hud_hidden', hidden ? 'true' : 'false');
      window.dispatchEvent(new Event('rt_hud_visibility_change'));
    }
  };

  const previewStyles: Record<typeof hudLayout, { container: React.CSSProperties; card: React.CSSProperties; text: React.CSSProperties }> = {
    standard: {
      container: { gap: '0.5rem', fontSize: '0.95rem' },
      card: { padding: '0.5rem', minWidth: '6.5rem' },
      text: { fontSize: '0.8rem' },
    },
    compact: {
      container: { gap: '0.4rem', fontSize: '0.9rem' },
      card: { padding: '0.4rem', minWidth: '6rem' },
      text: { fontSize: '0.75rem' },
    },
    minimal: {
      container: { gap: '0.3rem', fontSize: '0.85rem' },
      card: { padding: '0.32rem', minWidth: '5.5rem' },
      text: { fontSize: '0.7rem' },
    },
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
    <>
      <BackdropTransition show={show} duration={200}>
        <div 
          className="fixed inset-0 z-50 bg-black/80 pixel-border" 
          onClick={onClose}
        />
      </BackdropTransition>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <ModalTransition show={show} duration={300}>
          <div 
            className={cn(
              'border-4 pixel-border pointer-events-auto',
              'p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto',
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

            <RippleButton
              onClick={onClose}
              rippleColor="rgba(255, 255, 255, 0.4)"
              className="px-4 py-2 border-4 pixel-border font-bold focus:outline-none focus:ring-2 text-xs sm:text-sm"
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
            </RippleButton>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'audio' && (
          <section className="space-y-5">
            <div className="flex flex-col gap-4">
              <RippleButton
                onClick={toggleSound}
                rippleColor="rgba(0, 255, 255, 0.3)"
                className="w-full px-6 py-4 border-4 pixel-border font-bold text-base sm:text-lg md:text-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: soundEnabled ? '#00D9FF' : '#3E7CAC',
                  borderWidth: soundEnabled ? '4px' : '4px',
                  backgroundColor: soundEnabled ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.6)',
                  color: '#ffffff',
                  boxShadow: soundEnabled ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!soundEnabled) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!soundEnabled) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
                  }
                }}
              >
                {t(language, 'settings.audio.sound')} {soundEnabled ? t(language, 'settings.audio.soundOn') : t(language, 'settings.audio.soundOff')}
              </RippleButton>

              <div className="space-y-2 border-2 rounded px-4 py-3 transition-all" style={{ 
                borderColor: '#3E7CAC', 
                backgroundColor: 'rgba(0, 58, 99, 0.35)',
              }}>
                <div className="flex justify-between text-sm sm:text-base md:text-lg text-foreground/80 mb-2">
                  <span className="font-semibold">{t(language, 'settings.audio.soundVolume')}</span>
                  <span className="font-semibold">{Math.round(soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(soundVolume * 100)}
                  onChange={handleSoundVolumeChange}
                  className="w-full accent-primary cursor-pointer h-3 sm:h-4"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                />
              </div>

              <RippleButton
                onClick={toggleMusic}
                rippleColor="rgba(0, 255, 255, 0.3)"
                className="w-full px-6 py-4 border-4 pixel-border font-bold text-base sm:text-lg md:text-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: musicEnabled ? '#00D9FF' : '#3E7CAC',
                  borderWidth: musicEnabled ? '4px' : '4px',
                  backgroundColor: musicEnabled ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.6)',
                  color: '#ffffff',
                  boxShadow: musicEnabled ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!musicEnabled) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!musicEnabled) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
                  }
                }}
              >
                {t(language, 'settings.audio.music')} {musicEnabled ? t(language, 'settings.audio.musicOn') : t(language, 'settings.audio.musicOff')}
              </RippleButton>

              <div className="space-y-2 border-2 rounded px-4 py-3 transition-all" style={{ 
                borderColor: '#3E7CAC', 
                backgroundColor: 'rgba(0, 58, 99, 0.35)',
              }}>
                <div className="flex justify-between text-sm sm:text-base md:text-lg text-foreground/80 mb-2">
                  <span className="font-semibold">{t(language, 'settings.audio.musicVolume')}</span>
                  <span className="font-semibold">{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(musicVolume * 100)}
                  onChange={handleMusicVolumeChange}
                  className="w-full accent-primary cursor-pointer h-3 sm:h-4"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                />
              </div>

              <p className="text-sm sm:text-base text-foreground/60 mt-2 px-2">
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
              {(() => {
                const isPerformanceActive = reducedEffects && !screenShakeEnabled && !screenFlashEnabled;
                return (
                  <button
                    type="button"
                    className="w-full px-3 py-3 border-2 rounded text-left transition-all font-semibold relative"
                    style={{
                      borderColor: isPerformanceActive ? '#00D9FF' : '#3E7CAC',
                      borderWidth: isPerformanceActive ? '3px' : '2px',
                      backgroundColor: isPerformanceActive ? 'rgba(0, 217, 255, 0.15)' : 'rgba(0, 58, 99, 0.5)',
                      boxShadow: isPerformanceActive ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
                    }}
                    onClick={applyMobilePerformancePreset}
                    onMouseEnter={(e) => {
                      if (!isPerformanceActive) {
                        e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                        e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPerformanceActive) {
                        e.currentTarget.style.borderColor = '#3E7CAC';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                      }
                    }}
                  >
                    <div className="text-sm sm:text-base">
                      {t(language, 'settings.mobile.performance')}
                    </div>
                    <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.performance.desc')}</div>
                  </button>
                );
              })()}
              {(() => {
                const isVisualActive = reducedEffects && screenShakeEnabled && !screenFlashEnabled;
                return (
                  <button
                    type="button"
                    className="w-full px-3 py-3 border-2 rounded text-left transition-all font-semibold relative"
                    style={{
                      borderColor: isVisualActive ? '#00D9FF' : '#3E7CAC',
                      borderWidth: isVisualActive ? '3px' : '2px',
                      backgroundColor: isVisualActive ? 'rgba(0, 217, 255, 0.15)' : 'rgba(0, 58, 99, 0.5)',
                      boxShadow: isVisualActive ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
                    }}
                    onClick={applyMobileVisualPreset}
                    onMouseEnter={(e) => {
                      if (!isVisualActive) {
                        e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                        e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isVisualActive) {
                        e.currentTarget.style.borderColor = '#3E7CAC';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                      }
                    }}
                  >
                    <div className="text-sm sm:text-base">
                      {t(language, 'settings.mobile.visual')}
                    </div>
                    <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.visual.desc')}</div>
                  </button>
                );
              })()}
              {(() => {
                const isDesktopActive = !reducedEffects && screenShakeEnabled && screenFlashEnabled;
                return (
                  <button
                    type="button"
                    className="w-full px-3 py-3 border-2 rounded text-left transition-all font-semibold sm:col-span-2 relative"
                    style={{
                      borderColor: isDesktopActive ? '#00D9FF' : '#3E7CAC',
                      borderWidth: isDesktopActive ? '3px' : '2px',
                      backgroundColor: isDesktopActive ? 'rgba(0, 217, 255, 0.15)' : 'rgba(0, 58, 99, 0.5)',
                      boxShadow: isDesktopActive ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
                    }}
                    onClick={restoreDesktopDefaults}
                    onMouseEnter={(e) => {
                      if (!isDesktopActive) {
                        e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                        e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDesktopActive) {
                        e.currentTarget.style.borderColor = '#3E7CAC';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                      }
                    }}
                  >
                    <div className="text-sm sm:text-base">
                      {t(language, 'settings.mobile.reset')}
                    </div>
                    <div className="text-foreground/70 mt-1">{t(language, 'settings.mobile.reset.desc')}</div>
                  </button>
                );
              })()}
            </div>
            <div className="border-2 rounded px-3 py-3 space-y-3" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.35)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm sm:text-base">{t(language, 'settings.hud.layout')}</div>
                  <div className="text-foreground/70 text-xs sm:text-sm">{t(language, 'settings.hud.layout.desc')}</div>
                </div>
                <div className="inline-flex rounded-md overflow-hidden border-2" style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                  {(['standard', 'compact', 'minimal'] as const).map((layout) => {
                    const isActive = hudLayout === layout;
                    return (
                      <button
                        key={layout}
                        type="button"
                        className={
                          'px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold transition-colors ' +
                          (isActive
                            ? 'text-foreground'
                            : 'text-foreground/70 hover:text-foreground')
                        }
                        style={{
                          borderLeft: layout !== 'standard' ? '1px solid #3E7CAC' : 'none',
                          ...(isActive ? { backgroundColor: 'rgba(62, 124, 172, 0.3)' } : {})
                        }}
                        onClick={() => updateHudLayout(layout)}
                        aria-label={`Set HUD layout to ${layout}`}
                      >
                        {t(language, `settings.hud.layout.${layout}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded border px-3 py-2 bg-black/40" style={{ borderColor: '#3E7CAC' }}>
                <div
                  className="flex text-xs sm:text-sm"
                  style={{
                    gap: previewStyles[hudLayout].container.gap,
                    fontSize: previewStyles[hudLayout].container.fontSize,
                  }}
                  data-layout-preview={hudLayout}
                >
                  {(['score', 'vitals', 'controls'] as const).map((label) => (
                    <div
                      key={label}
                      className="flex-1 border rounded"
                      style={{
                        borderColor: '#3E7CAC',
                        padding: previewStyles[hudLayout].card.padding,
                        minWidth: previewStyles[hudLayout].card.minWidth,
                      }}
                    >
                      <div className="font-semibold" style={{ fontSize: previewStyles[hudLayout].container.fontSize }}>
                        {t(language, `settings.hud.preview.${label}`)}
                      </div>
                      <div className="text-foreground/70" style={previewStyles[hudLayout].text}>
                        {t(language, `settings.hud.preview.${label}Content`)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-foreground/60 mt-2">
                  {t(language, 'settings.hud.layout.preview')}
                </div>
              </div>
              <label 
                className="flex items-start gap-3 cursor-pointer border-2 rounded px-3 py-2 transition-all relative" 
                style={{ 
                  borderColor: hudHidden ? '#00D9FF' : '#3E7CAC',
                  borderWidth: hudHidden ? '3px' : '2px',
                  backgroundColor: hudHidden ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.5)',
                  boxShadow: hudHidden ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }} 
                onMouseEnter={(e) => { 
                  if (!hudHidden) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                  }
                }} 
                onMouseLeave={(e) => { 
                  if (!hudHidden) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary w-5 h-5 cursor-pointer"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                  checked={hudHidden}
                  onChange={(e) => toggleHudHidden(e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {t(language, 'settings.hud.hide')}
                  </span>
                  <span className="block text-foreground/70 text-xs sm:text-sm mt-0.5">
                    {t(language, 'settings.hud.hide.desc')}
                  </span>
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <label 
                className="flex items-start gap-3 cursor-pointer border-2 rounded px-3 py-2 transition-all relative" 
                style={{ 
                  borderColor: screenShakeEnabled ? '#00D9FF' : '#3E7CAC',
                  borderWidth: screenShakeEnabled ? '3px' : '2px',
                  backgroundColor: screenShakeEnabled ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.5)',
                  boxShadow: screenShakeEnabled ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }} 
                onMouseEnter={(e) => { 
                  if (!screenShakeEnabled) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                  }
                }} 
                onMouseLeave={(e) => { 
                  if (!screenShakeEnabled) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary w-5 h-5 cursor-pointer"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                  checked={screenShakeEnabled}
                  onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {t(language, 'settings.comfort.screenShake')}
                  </span>
                  <span className="block text-foreground/70 text-xs sm:text-sm mt-0.5">
                    {t(language, 'settings.comfort.screenShake.desc')}
                  </span>
                </span>
              </label>

              <label 
                className="flex items-start gap-3 cursor-pointer border-2 rounded px-3 py-2 transition-all relative" 
                style={{ 
                  borderColor: screenFlashEnabled ? '#00D9FF' : '#3E7CAC',
                  borderWidth: screenFlashEnabled ? '3px' : '2px',
                  backgroundColor: screenFlashEnabled ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.5)',
                  boxShadow: screenFlashEnabled ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }} 
                onMouseEnter={(e) => { 
                  if (!screenFlashEnabled) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                  }
                }} 
                onMouseLeave={(e) => { 
                  if (!screenFlashEnabled) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary w-5 h-5 cursor-pointer"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                  checked={screenFlashEnabled}
                  onChange={(e) => setScreenFlashEnabled(e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {t(language, 'settings.comfort.screenFlash')}
                  </span>
                  <span className="block text-foreground/70 text-xs sm:text-sm mt-0.5">
                    {t(language, 'settings.comfort.screenFlash.desc')}
                  </span>
                </span>
              </label>

              <label 
                className="flex items-start gap-3 cursor-pointer border-2 rounded px-3 py-2 transition-all relative" 
                style={{ 
                  borderColor: reducedEffects ? '#00D9FF' : '#3E7CAC',
                  borderWidth: reducedEffects ? '3px' : '2px',
                  backgroundColor: reducedEffects ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.5)',
                  boxShadow: reducedEffects ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }} 
                onMouseEnter={(e) => { 
                  if (!reducedEffects) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                  }
                }} 
                onMouseLeave={(e) => { 
                  if (!reducedEffects) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary w-5 h-5 cursor-pointer"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                  checked={reducedEffects}
                  onChange={(e) => setReducedEffects(e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {t(language, 'settings.comfort.reducedEffects')}
                  </span>
                  <span className="block text-foreground/70 text-xs sm:text-sm mt-0.5">
                    {t(language, 'settings.comfort.reducedEffects.desc')}
                  </span>
                </span>
              </label>

              <label 
                className="flex items-start gap-3 cursor-pointer border-2 rounded px-3 py-2 transition-all relative" 
                style={{ 
                  borderColor: highContrastMode ? '#00D9FF' : '#3E7CAC',
                  borderWidth: highContrastMode ? '3px' : '2px',
                  backgroundColor: highContrastMode ? 'rgba(0, 217, 255, 0.12)' : 'rgba(0, 58, 99, 0.5)',
                  boxShadow: highContrastMode ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
                }} 
                onMouseEnter={(e) => { 
                  if (!highContrastMode) {
                    e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.2)';
                  }
                }} 
                onMouseLeave={(e) => { 
                  if (!highContrastMode) {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary w-5 h-5 cursor-pointer"
                  style={{
                    accentColor: '#00D9FF',
                  }}
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {t(language, 'settings.comfort.highContrast')}
                  </span>
                  <span className="block text-foreground/70 text-xs sm:text-sm mt-0.5">
                    {t(language, 'settings.comfort.highContrast.desc')}
                  </span>
                </span>
              </label>

              <div 
                className="border-2 rounded px-3 py-2 flex items-center justify-between transition-all" 
                style={{ 
                  borderColor: '#3E7CAC', 
                  backgroundColor: 'rgba(0, 58, 99, 0.5)',
                }} 
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.8)';
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.15)';
                }} 
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = '#3E7CAC';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.5)';
                }}
              >
                <div>
                  <div className="font-semibold">{t(language, 'settings.language.label')}</div>
                  <div className="text-foreground/70 text-xs sm:text-sm">
                    {t(language, 'settings.language.desc')}
                  </div>
                </div>
                <select
                  className="ml-3 px-2 py-1.5 border-2 rounded text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                  style={{
                    borderColor: '#3E7CAC',
                    backgroundColor: 'rgba(0, 58, 99, 0.7)',
                    color: '#e8f4ff',
                  }}
                  value={language}
                  onChange={handleLanguageChange}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00D9FF';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 217, 255, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#3E7CAC';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="en" style={{ backgroundColor: '#003A63', color: '#e8f4ff' }}>{t(language, 'settings.language.en')}</option>
                  <option value="de" style={{ backgroundColor: '#003A63', color: '#e8f4ff' }}>{t(language, 'settings.language.de')}</option>
                </select>
              </div>
            </div>
          </section>
        )}
          </div>
        </ModalTransition>
      </div>
    </>
  );
}

export default SettingsModal;
