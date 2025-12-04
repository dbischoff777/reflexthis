'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BuildInfo } from '@/components/BuildInfo';
import { DifficultySelector } from '@/components/DifficultySelector';
import { ModeSelector } from '@/components/ModeSelector';
import { StatsModal } from '@/components/StatsModal';
import { DemoMode } from '@/components/DemoMode';
import { LoadingScreen } from '@/components/LoadingScreen';
import { GameButtonGridWebGL } from '@/components/GameButton3DWebGL';
import SettingsModal from '@/components/SettingsModal';
import { DifficultyPreset } from '@/lib/difficulty';
import { GameMode } from '@/lib/gameModes';
import { GameProvider, useGameState } from '@/lib/GameContext';
import { stopBackgroundMusic, setGamePageActive, playMenuMusic, stopMenuMusic, preloadAudioAssets } from '@/lib/soundUtils';
import { t } from '@/lib/i18n';

const WARMUP_BUTTONS = Array.from({ length: 10 }, (_, i) => ({
  index: i + 1,
  highlighted: false,
}));

/**
 * BackgroundVideo component - Smooth looping background video with crossfade
 */
function BackgroundVideo() {
  const [activeVideo, setActiveVideo] = useState(0);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const fadeTriggeredRef = useRef(false);

  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || !video2) return;

    const checkAndFade = () => {
      const currentVideo = activeVideo === 0 ? video1 : video2;
      const nextVideo = activeVideo === 0 ? video2 : video1;
      
      if (!currentVideo || !nextVideo) return;
      
      // Start crossfade when we're 0.8 seconds from the end
      if (currentVideo.duration && currentVideo.currentTime >= currentVideo.duration - 0.8 && !fadeTriggeredRef.current) {
        fadeTriggeredRef.current = true;
        
        // Prepare next video
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
        
        // Start crossfade transition
        setTimeout(() => {
          if (currentVideo && nextVideo) {
            currentVideo.style.opacity = '0';
            nextVideo.style.opacity = '1';
            setActiveVideo(activeVideo === 0 ? 1 : 0);
            
            // Reset trigger when next video starts
            setTimeout(() => {
              fadeTriggeredRef.current = false;
            }, 1000);
          }
        }, 300);
      }
    };

    const interval = setInterval(checkAndFade, 100); // Check every 100ms

    return () => {
      clearInterval(interval);
    };
  }, [activeVideo]);

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <video
        ref={video1Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
        style={{ opacity: activeVideo === 0 ? 1 : 0 }}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
      <video
        ref={video2Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
        style={{ opacity: activeVideo === 1 ? 1 : 0 }}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function LandingPageContent() {
  const router = useRouter();
  const {
    language,
    difficulty,
    setDifficulty,
    gameMode,
    setGameMode,
    sessionStatistics,
    musicEnabled,
    toggleMusic,
    reducedEffects,
    highContrastMode,
  } = useGameState();

  const LOADING_TIPS = [
    t(language, 'landing.tip.effects'),
    t(language, 'landing.tip.combo'),
    t(language, 'landing.tip.reflex'),
    t(language, 'landing.tip.keybindings'),
  ];
  const [showMode, setShowMode] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootTipIndex, setBootTipIndex] = useState(0);
  const [demoReady, setDemoReady] = useState(false);

  // Hidden warm-up grid to pre-initialize WebGL and shaders
  const WarmupGrid = () => (
    <div className="pointer-events-none fixed -z-10 opacity-0 w-[1px] h-[1px] overflow-hidden">
      <GameButtonGridWebGL
        buttons={WARMUP_BUTTONS}
        highlightDuration={1000}
        onPress={() => {}}
        disabled
        keyLabels={{}}
        showLabels={false}
        gameState={{
          combo: 0,
          lives: 5,
          maxLives: 5,
          gameOver: false,
          score: 0,
          difficulty: 'medium',
        }}
        comboMilestone={null}
      />
    </div>
  );

  // Initial boot splash: preload critical assets & hold landing until ready.
  // Only runs on first app start in this browser tab; subsequent navigations skip the splash.
  useEffect(() => {
    let cancelled = false;

    // If we've already shown the splash once in this tab, skip bootstrapping entirely
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('reflex_boot_done') === '1') {
      setBootstrapping(false);
      return () => {
        cancelled = true;
      };
    }

    let completedSteps = 0;
    const totalSteps = 4; // icon, animation, audio, minimum delay

    const advanceProgress = () => {
      if (cancelled) return;
      completedSteps += 1;
      const pct = Math.round((completedSteps / totalSteps) * 100);
      setBootProgress(pct);
    };

    const preloadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    const preloadVideo = (src: string) =>
      new Promise<void>((resolve) => {
        const video = document.createElement('video');
        const cleanup = () => {
          video.onloadeddata = null;
          video.onerror = null;
        };
        video.onloadeddata = () => {
          cleanup();
          resolve();
        };
        video.onerror = () => {
          cleanup();
          resolve();
        };
        video.src = src;
        video.load();
      });

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 2000)).then(advanceProgress);

    const imagePromise = preloadImage('/logo/ReflexIcon.jpg').then(advanceProgress);
    const videoPromise = preloadVideo('/animation/ReflexIconAnimated.mp4').then(advanceProgress);
    const audioPromise = preloadAudioAssets().then(advanceProgress);

    // Preload game route and 3D bundle in the background while splash is showing
    // router.prefetch in the app router returns void, so we just fire-and-forget.
    try {
      router.prefetch('/game');
    } catch {
      // Ignore prefetch errors – it will still load on first navigation.
    }

    Promise.all([imagePromise, videoPromise, audioPromise, minDelay]).then(() => {
      if (!cancelled) {
        setBootstrapping(false);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('reflex_boot_done', '1');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate loading tips while bootstrapping
  useEffect(() => {
    if (!bootstrapping) return;
    const interval = setInterval(() => {
      setBootTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [bootstrapping]);

  // Ensure game music is stopped on landing page and prevent any game sounds
  // Play menu music if enabled
  useEffect(() => {
    stopBackgroundMusic();
    // Mark that we're not on the game page to prevent sounds
    setGamePageActive(false);
    
    // Play menu music if music is enabled
    if (musicEnabled) {
      playMenuMusic(true);
    } else {
      stopMenuMusic();
    }
    
    // Also stop on cleanup/unmount
    return () => {
      stopBackgroundMusic();
      stopMenuMusic();
      setGamePageActive(false);
    };
  }, [musicEnabled]);

  // Handle ESC key for exit confirmation (modals handle their own ESC keys)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't interfere when modals are open (they handle their own ESC)
      if (showSettings || showStats || showMode || showDifficulty) return;
      
      e.preventDefault();
      setShowExitConfirm(true);
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showSettings, showStats, showMode, showDifficulty]);

  // Handle exit confirmation
  const handleExit = async () => {
    // Check if we're in Electron
    if (typeof window !== 'undefined' && window.electronAPI?.quit) {
      try {
        await window.electronAPI.quit();
      } catch (error) {
        console.error('Failed to quit app:', error);
      }
    } else {
      // Fallback for web version - just close the window/tab
      if (window.confirm('Are you sure you want to exit?')) {
        window.close();
      }
    }
  };

  if (bootstrapping) {
    const statusLabel =
      bootProgress < 40
        ? t(language, 'loading.engine')
        : bootProgress < 75
        ? t(language, 'loading.assets')
        : t(language, 'loading.finishing');

    // Reduced effects / high-contrast: no video, simple static splash
    if (reducedEffects || highContrastMode) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden">
          {/* Hidden warm-up grid runs behind splash to pre-initialize WebGL */}
          <WarmupGrid />
          <div className="relative w-full h-full flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <img
                src="/logo/ReflexIcon.jpg"
                alt="Reflex This"
                className="max-w-[220px] w-[45vw] rounded-lg border-4 border-primary bg-black object-contain"
              />
              <p className="text-sm sm:text-base font-semibold text-primary">
                {statusLabel}
              </p>
            </div>

            <div className="w-56 sm:w-72 border-2 border-primary bg-black rounded-full overflow-hidden">
              <div
                className="h-3 bg-primary transition-all duration-200"
                style={{ width: `${bootProgress}%` }}
              />
            </div>

            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono tracking-wide">
              {bootProgress}%
            </p>
          </div>
        </div>
      );
    }

    // Full animated splash
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden">
        {/* Hidden warm-up grid runs behind splash to pre-initialize WebGL */}
        <WarmupGrid />
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            className="max-w-[520px] w-[70vw] max-h-[70vh] rounded-xl shadow-2xl shadow-primary/40 border-4 border-primary/60 bg-black/80 object-contain"
            src="/animation/ReflexIconAnimated.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

          {/* Boot progress indicator + tips */}
          <div className="pointer-events-none absolute bottom-10 w-full flex flex-col items-center gap-3 px-4">
            <div className="w-56 sm:w-72 border-2 border-primary/70 bg-black/70 rounded-full overflow-hidden shadow-lg shadow-primary/30">
              <div
                className="h-3 bg-gradient-to-r from-primary via-secondary to-chart-3 relative transition-all duration-200"
                style={{ width: `${bootProgress}%` }}
              >
                {/* Diagonal scanlines inside the bar */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0, rgba(0,0,0,0.12) 4px, transparent 4px, transparent 8px)',
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono tracking-wide">
              {statusLabel} {bootProgress}%
            </p>
            <p className="text-[11px] sm:text-xs text-foreground/70 font-mono text-center max-w-md">
              {LOADING_TIPS[bootTipIndex]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden">
      {/* Full-screen background video with smooth looping */}
      {!reducedEffects && <BackgroundVideo />}
      {/* Dark overlay for better text readability */}
      <div className={`fixed inset-0 z-[1] ${reducedEffects ? 'bg-black/60' : 'bg-black/40'}`} aria-hidden="true" />
      
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl text-center">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary text-glow mb-2 sm:mb-4 tracking-tight px-4 sm:px-6 py-2 sm:py-3 inline-block border-3 sm:border-4 border-primary rounded-lg">
            {t(language, 'landing.title')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t(language, 'landing.subtitle')}
          </p>
        </div>
        
        {/* Demo Mode - only show once the demo canvas has mounted */}
        {!showMode && !showDifficulty && !showStats && (
          <div className={`mb-8 w-full transition-opacity duration-300 ${demoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <DemoMode onReady={() => setDemoReady(true)} />
          </div>
        )}
        
        {/* Statistics Modal */}
        <StatsModal 
          show={showStats} 
          stats={sessionStatistics} 
          onClose={() => setShowStats(false)} 
        />

        {/* Mode Selector */}
        {showMode && !showDifficulty && !showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <ModeSelector
              selected={gameMode}
              onSelect={(mode) => {
                setGameMode(mode);
                setShowMode(false);
                // Auto-select nightmare difficulty when nightmare mode is chosen
                if (mode === 'nightmare') {
                  setDifficulty('nightmare');
                }
                setShowDifficulty(true);
              }}
              onCancel={() => setShowMode(false)}
            />
          </div>
        )}

        {/* Difficulty Selector */}
        {showDifficulty && !showMode && !showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <DifficultySelector
              selected={difficulty}
              onSelect={setDifficulty}
              gameMode={gameMode}
              onCancel={() => {
                setShowDifficulty(false);
                setShowMode(true);
              }}
            />
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {!showStats && (
            <Link 
              href="/game"
              onClick={(e) => {
                if (showDifficulty) {
                  // Start game - navigate directly, loading screen will show on game page
                  // Don't prevent default, let Next.js handle navigation
                } else if (showMode) {
                  // ModeSelector is displayed - clicking "Select Difficulty" opens DifficultySelector
                  e.preventDefault();
                  setShowMode(false);
                  setShowDifficulty(true);
                } else if (!showMode && !showDifficulty) {
                  e.preventDefault();
                  setShowMode(true);
                }
              }}
              className="group relative inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-lg sm:text-xl font-bold border-4 border-primary bg-primary text-primary-foreground transition-all duration-100 hover:border-secondary hover:bg-secondary active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
            >
              <span className="relative z-10">
                {showDifficulty ? t(language, 'landing.startGame') : showMode ? t(language, 'landing.selectDifficulty') : t(language, 'landing.selectMode')}
              </span>
            </Link>
          )}

          <button
            onClick={() => {
              setShowStats(!showStats);
              setShowDifficulty(false);
              setShowMode(false);
              setShowSettings(false);
            }}
            draggable={false}
            style={showMode ? {
              background: 'linear-gradient(135deg, #1e3a5f 0%, #000000 100%)',
              borderColor: '#1e3a5f',
            } : {
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            className={showMode 
              ? "inline-flex items-center justify-center h-8 px-3 text-xs sm:text-sm font-semibold border-2 text-foreground/70 hover:text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-primary pixel-border"
              : "inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
            }
          >
            {showStats ? t(language, 'landing.hideStats') : t(language, 'landing.viewStats')}
          </button>

          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowStats(false);
              setShowDifficulty(false);
              setShowMode(false);
            }}
            draggable={false}
            style={showMode ? {
              background: 'linear-gradient(135deg, #1e3a5f 0%, #000000 100%)',
              borderColor: '#1e3a5f',
            } : {
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            className={showMode 
              ? "inline-flex items-center justify-center h-8 px-3 text-xs sm:text-sm font-semibold border-2 text-foreground/70 hover:text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-primary pixel-border"
              : "inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
            }
          >
            {t(language, 'landing.settings')}
          </button>

          <button
            onClick={() => setShowExitConfirm(true)}
            draggable={false}
            style={showMode ? {
              background: 'linear-gradient(135deg, #1e3a5f 0%, #000000 100%)',
              borderColor: '#1e3a5f',
            } : {
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
            className={showMode 
              ? "inline-flex items-center justify-center h-8 px-3 text-xs sm:text-sm font-semibold border-2 text-foreground/70 hover:text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-1 focus:ring-primary pixel-border"
              : "inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 text-foreground hover:opacity-90 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
            }
          >
            {t(language, 'landing.exitGame')}
          </button>
        </div>
      </main>

      {/* Hidden warm-up 3D grid to keep WebGL and shaders hot on landing */}
      <WarmupGrid />

      {/* Unified Settings Modal */}
      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border-4 border-secondary pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-4 pixel-border px-4 py-2 inline-block break-words">
              {t(language, 'landing.exitConfirm.title')}
            </h2>
            <p className="text-sm text-foreground/80 mb-6 break-words">
              {t(language, 'landing.exitConfirm.message')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-6 py-3 border-4 border-border bg-card text-foreground pixel-border font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {t(language, 'landing.exitConfirm.cancel')}
              </button>
              <button
                onClick={handleExit}
                className="px-6 py-3 border-4 border-secondary bg-secondary text-secondary-foreground pixel-border font-bold hover:bg-secondary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                {t(language, 'landing.exitConfirm.exit')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Music Mute Button - Fixed position */}
      <button
        onClick={toggleMusic}
        draggable={false}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #000000 100%)',
          borderColor: '#1e3a5f',
        }}
        className="fixed top-4 right-4 z-50 inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 border-2 text-foreground/70 hover:text-foreground hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary pixel-border"
        aria-label={musicEnabled ? 'Mute music' : 'Unmute music'}
      >
        {musicEnabled ? (
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>
      
      {/* Build Info Footer */}
      <footer className="relative z-10 w-full flex justify-center pb-4">
        <BuildInfo className="text-center" />
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <GameProvider>
      <LandingPageContent />
    </GameProvider>
  );
}
