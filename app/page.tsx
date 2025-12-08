'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BuildInfo } from '@/components/BuildInfo';
import { ModeAndDifficultySelector } from '@/components/ModeAndDifficultySelector';
import { StatsModal } from '@/components/StatsModal';
import { RippleButton } from '@/components/RippleButton';
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
 * Optimized for performance with GPU acceleration and efficient event handling
 */
const BackgroundVideo = React.memo(function BackgroundVideo() {
  const [activeVideo, setActiveVideo] = useState(0);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const fadeTriggeredRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || !video2) return;

    // Use timeupdate event for more efficient checking (fires ~4 times per second)
    const handleTimeUpdate = () => {
      const currentVideo = activeVideo === 0 ? video1 : video2;
      const nextVideo = activeVideo === 0 ? video2 : video1;
      
      if (!currentVideo || !nextVideo || !currentVideo.duration) return;
      
      // Start crossfade earlier to ensure smooth transition - 1.2 seconds before end
      // This accounts for the 1200ms transition duration
      if (currentVideo.currentTime >= currentVideo.duration - 1.2 && !fadeTriggeredRef.current) {
        fadeTriggeredRef.current = true;
        
        // Prepare next video - ensure it's ready
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
        
        // Wait for next video to be ready before starting fade
        const checkReady = () => {
          if (nextVideo.readyState >= 2) { // HAVE_CURRENT_DATA
            // Use requestAnimationFrame for smoother transitions
            rafIdRef.current = requestAnimationFrame(() => {
              if (currentVideo && nextVideo) {
                currentVideo.style.opacity = '0';
                nextVideo.style.opacity = '1';
                setActiveVideo(activeVideo === 0 ? 1 : 0);
                
                // Reset trigger after transition completes
                setTimeout(() => {
                  fadeTriggeredRef.current = false;
                }, 1300);
              }
            });
          } else {
            // Retry if not ready yet
            requestAnimationFrame(checkReady);
          }
        };
        checkReady();
      }
    };

    // Handle video ended event as fallback for smooth looping
    const handleEnded = (video: HTMLVideoElement, isCurrent: boolean) => {
      if (isCurrent && !fadeTriggeredRef.current) {
        // If we missed the timeupdate, force transition
        const otherVideo = video === video1 ? video2 : video1;
        if (otherVideo) {
          fadeTriggeredRef.current = true;
          otherVideo.currentTime = 0;
          otherVideo.play().catch(() => {});
          video.style.opacity = '0';
          otherVideo.style.opacity = '1';
          setActiveVideo(video === video1 ? 1 : 0);
          setTimeout(() => {
            fadeTriggeredRef.current = false;
          }, 1300);
        }
      }
    };

    // Attach event listeners to both videos
    video1.addEventListener('timeupdate', handleTimeUpdate);
    video2.addEventListener('timeupdate', handleTimeUpdate);
    video1.addEventListener('ended', () => handleEnded(video1, activeVideo === 0));
    video2.addEventListener('ended', () => handleEnded(video2, activeVideo === 1));

    return () => {
      video1.removeEventListener('timeupdate', handleTimeUpdate);
      video2.removeEventListener('timeupdate', handleTimeUpdate);
      video1.removeEventListener('ended', () => handleEnded(video1, activeVideo === 0));
      video2.removeEventListener('ended', () => handleEnded(video2, activeVideo === 1));
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [activeVideo]);

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <video
        ref={video1Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
        style={{ 
          opacity: activeVideo === 0 ? 1 : 0,
          transform: 'translateZ(0)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
      <video
        ref={video2Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
        style={{ 
          opacity: activeVideo === 1 ? 1 : 0,
          transform: 'translateZ(0)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/animation/menu-background-animated.mp4" type="video/mp4" />
      </video>
    </div>
  );
});

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
  const [showStats, setShowStats] = useState(false);
  const [statsMode, setStatsMode] = useState<GameMode | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Always start with true for hydration safety - check sessionStorage after mount
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootTipIndex, setBootTipIndex] = useState(0);
  const [demoReady, setDemoReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Use a ref to prevent multiple initializations even if component remounts (StrictMode protection)
  const bootstrappingInitRef = useRef(false);

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

  // Mark component as mounted after hydration to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial boot splash: preload critical assets & hold landing until ready.
  // Only runs on first app start in this browser tab; subsequent navigations skip the splash.
  useEffect(() => {
    // Wait for hydration to complete
    if (!mounted) return;

    // Prevent re-initialization (React StrictMode protection)
    if (bootstrappingInitRef.current) {
      return;
    }

    // Mark as initialized immediately to prevent multiple runs (even if we skip)
    bootstrappingInitRef.current = true;

    // Check sessionStorage after hydration to determine if we should show splash
    const bootDone = typeof window !== 'undefined' && window.sessionStorage.getItem('reflex_boot_done') === '1';
    
    if (bootDone) {
      // Already booted - skip splash
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    let completedSteps = 0;
    const totalSteps = 5; // icon, animation, audio, button images, minimum delay

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

    // Preload all button images for mode selector
    const buttonImages = [
      '/buttons/reflexRegular.png',
      '/buttons/reflexHover.png',
      '/buttons/sequenceRegular.png',
      '/buttons/sequenceHover.png',
      '/buttons/survivalRegular.png',
      '/buttons/survivalHover.png',
      '/buttons/nightmareRegular.png',
      '/buttons/nightmareHover.png',
      '/buttons/oddoneoutRegular.png',
      '/buttons/oddoneoutHover.png',
    ];
    const buttonImagePromises = buttonImages.map(img => preloadImage(img));
    const allButtonImagesPromise = Promise.all(buttonImagePromises).then(advanceProgress);

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

    Promise.all([imagePromise, videoPromise, audioPromise, allButtonImagesPromise, minDelay]).then(() => {
      if (!cancelled) {
        setBootstrapping(false);
        // Set sessionStorage flag ONLY after all assets are successfully preloaded
        // This ensures that if the page unmounts/refreshes before preloading completes,
        // the next mount will still show the splash and complete the preloading
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('reflex_boot_done', '1');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mounted, router]);

  // Rotate loading tips while bootstrapping - memoized to prevent recreation
  const loadingTips = useMemo(() => LOADING_TIPS, [language]);
  
  useEffect(() => {
    if (!bootstrapping) return;
    const interval = setInterval(() => {
      setBootTipIndex((prev) => (prev + 1) % loadingTips.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [bootstrapping, loadingTips.length]);

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
  // Memoized callback to prevent unnecessary re-renders
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // Don't interfere when modals are open (they handle their own ESC)
    if (showSettings || showStats || showMode) return;
    
    e.preventDefault();
    setShowExitConfirm(true);
  }, [showSettings, showStats, showMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  // Handle exit confirmation - memoized to prevent recreation
  const handleExit = useCallback(async () => {
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
  }, []);

  // During SSR or before hydration, always render splash placeholder to match server/client
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Placeholder during SSR/hydration - will update after mount */}
        </div>
      </div>
    );
  }

  // After hydration, check if we should show splash or landing page
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
            preload="auto"
            style={{
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
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
      
      <main className="relative z-10 flex flex-col items-center justify-between flex-1 w-full max-w-4xl text-center py-4">
        {/* Center content area */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          {/* Hero Section - Matches demo mode width for symmetry */}
          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6 w-full max-w-md mx-auto">
          {/* Subtitle above title */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t(language, 'landing.subtitle')}
          </p>
          {/* Main title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary text-glow mb-2 sm:mb-4 tracking-tight px-4 sm:px-6 py-2 sm:py-3 block w-full border-3 sm:border-4 border-primary rounded-lg">
            {t(language, 'landing.title')}
          </h1>
        </div>
        
        {/* Demo Mode - only show once the demo canvas has mounted */}
        {!showMode && !showStats && (
          <div className={`mb-6 w-full max-w-md mx-auto transition-opacity duration-300 ${demoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <DemoMode onReady={() => setDemoReady(true)} />
          </div>
        )}
        
        {/* Statistics Modal */}
        <StatsModal 
          show={showStats} 
          stats={sessionStatistics} 
          gameMode={statsMode}
          onClose={() => {
            setShowStats(false);
            setStatsMode(undefined);
            // Show mode selector when closing stats modal
            setShowMode(true);
          }} 
        />

        {/* Combined Mode and Difficulty Selector */}
        {showMode && !showStats && (
          <div className="mb-6 w-full max-w-md mx-auto">
            <ModeAndDifficultySelector
              selectedMode={gameMode}
              selectedDifficulty={difficulty}
              onStart={(mode, selectedDifficulty) => {
                // Update state first - these update localStorage synchronously in GameContext
                setGameMode(mode);
                setDifficulty(selectedDifficulty);
                setShowMode(false);
                // Use startTransition to ensure state updates are flushed before navigation
                // This ensures the game page reads the correct mode/difficulty
                startTransition(() => {
                  router.push('/game');
                });
              }}
              onShowStats={(mode) => {
                setStatsMode(mode);
                setShowStats(true);
              }}
              onCancel={() => setShowMode(false)}
            />
          </div>
        )}
        
        {/* Action Buttons - Directly beneath demo/mode selector, match demo mode width */}
        {!showMode && !showStats && (
          <div className="flex flex-row gap-2 sm:gap-3 items-center justify-center w-full max-w-md mx-auto">
            <Link 
              href="/game"
              onClick={(e) => {
                e.preventDefault();
                setShowMode(true);
              }}
              className="group relative inline-flex items-center justify-center flex-1 min-w-0 min-h-[56px] px-2 sm:px-3 py-3 text-xs sm:text-sm font-bold border-4 border-primary bg-primary text-white transition-all duration-100 hover:border-primary hover:bg-primary/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
            >
              <span className="relative z-10 truncate">
                {t(language, 'landing.selectMode')}
              </span>
            </Link>

            <RippleButton
              onClick={() => {
                setShowSettings(true);
              }}
              rippleColor="rgba(0, 255, 255, 0.3)"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
              className="inline-flex items-center justify-center flex-1 min-w-0 min-h-[56px] px-2 sm:px-3 py-3 text-xs sm:text-sm font-semibold border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ffff';
                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3E7CAC';
                e.currentTarget.style.backgroundColor = '#003A63';
              }}
            >
              <span className="truncate">
                {t(language, 'landing.settings')}
              </span>
            </RippleButton>

            <RippleButton
              onClick={() => setShowExitConfirm(true)}
              rippleColor="rgba(255, 0, 0, 0.3)"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
              className="inline-flex items-center justify-center flex-1 min-w-0 min-h-[56px] px-2 sm:px-3 py-3 text-xs sm:text-sm font-semibold border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ffff';
                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3E7CAC';
                e.currentTarget.style.backgroundColor = '#003A63';
              }}
            >
              <span className="truncate">
                {t(language, 'landing.exitGame')}
              </span>
            </RippleButton>
            
            {/* Music Toggle Button - In button row next to Exit Game */}
            <RippleButton
              onClick={toggleMusic}
              rippleColor="rgba(0, 255, 255, 0.3)"
              style={{
                borderColor: '#3E7CAC',
                backgroundColor: '#003A63',
              }}
              className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ffff';
                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3E7CAC';
                e.currentTarget.style.backgroundColor = '#003A63';
              }}
              aria-label={musicEnabled ? 'Mute music' : 'Unmute music'}
            >
              {musicEnabled ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </RippleButton>
          </div>
        )}
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
          <div 
            className="border-4 pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_20px_rgba(62,124,172,0.4)]"
            style={{
              borderColor: '#3E7CAC',
              backgroundColor: '#003A63',
            }}
          >
            <h2 
              className="text-2xl sm:text-3xl font-bold text-foreground mb-4 pixel-border px-4 py-2 inline-block break-words"
              style={{ borderColor: '#3E7CAC' }}
            >
              {t(language, 'landing.exitConfirm.title')}
            </h2>
            <p className="text-sm text-foreground/80 mb-6 break-words">
              {t(language, 'landing.exitConfirm.message')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-6 py-3 border-4 pixel-border font-bold transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#3E7CAC',
                  backgroundColor: 'rgba(0, 58, 99, 0.6)',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(62, 124, 172, 0.7)';
                  e.currentTarget.style.backgroundColor = 'rgba(62, 124, 172, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3E7CAC';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 58, 99, 0.6)';
                }}
              >
                {t(language, 'landing.exitConfirm.cancel')}
              </button>
              <button
                onClick={handleExit}
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
                {t(language, 'landing.exitConfirm.exit')}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
