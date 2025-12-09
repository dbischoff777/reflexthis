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
  const [videoError, setVideoError] = useState(false);
  const [secondVideoLoaded, setSecondVideoLoaded] = useState(false);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const fadeTriggeredRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const activeVideoRef = useRef(0); // Use ref to avoid stale closure

  // Keep ref in sync with state
  useEffect(() => {
    activeVideoRef.current = activeVideo;
  }, [activeVideo]);

  // Handle video errors with fallback
  useEffect(() => {
    const video1 = video1Ref.current;
    if (!video1) return;

    const handleVideoError = () => {
      console.warn('Background video failed to load, using fallback');
      setVideoError(true);
    };

    video1.addEventListener('error', handleVideoError);
    return () => {
      video1.removeEventListener('error', handleVideoError);
    };
  }, []);

  // Lazy load second video after first video starts playing
  useEffect(() => {
    const video1 = video1Ref.current;
    if (!video1 || secondVideoLoaded) return;

    const handleCanPlay = () => {
      // Start loading second video after first is ready
      setSecondVideoLoaded(true);
    };

    if (video1.readyState >= 3) {
      // Already ready
      setSecondVideoLoaded(true);
    } else {
      video1.addEventListener('canplay', handleCanPlay, { once: true });
    }

    return () => {
      video1.removeEventListener('canplay', handleCanPlay);
    };
  }, [secondVideoLoaded]);

  // Set up crossfade logic when both videos are available
  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || !secondVideoLoaded || !video2) return;

    // Handle video2 errors
    const handleVideo2Error = () => {
      console.warn('Second background video failed to load');
      // Don't set videoError, just continue with single video
    };
    video2.addEventListener('error', handleVideo2Error);

    // Use timeupdate event for more efficient checking (fires ~4 times per second)
    const handleTimeUpdate = () => {
      // Use ref to get current value, avoiding stale closure
      const currentActive = activeVideoRef.current;
      const currentVideo = currentActive === 0 ? video1 : video2;
      const nextVideo = currentActive === 0 ? video2 : video1;
      
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
              if (currentVideo && nextVideo && video1Ref.current && video2Ref.current) {
                currentVideo.style.opacity = '0';
                nextVideo.style.opacity = '1';
                const newActive = currentActive === 0 ? 1 : 0;
                setActiveVideo(newActive);
                
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
    const handleEnded1 = () => {
      const currentActive = activeVideoRef.current;
      if (currentActive === 0 && !fadeTriggeredRef.current && video2Ref.current) {
        fadeTriggeredRef.current = true;
        const otherVideo = video2Ref.current;
        otherVideo.currentTime = 0;
        otherVideo.play().catch(() => {});
        if (video1Ref.current) {
          video1Ref.current.style.opacity = '0';
        }
        otherVideo.style.opacity = '1';
        setActiveVideo(1);
        setTimeout(() => {
          fadeTriggeredRef.current = false;
        }, 1300);
      }
    };

    const handleEnded2 = () => {
      const currentActive = activeVideoRef.current;
      if (currentActive === 1 && !fadeTriggeredRef.current && video1Ref.current) {
        fadeTriggeredRef.current = true;
        const otherVideo = video1Ref.current;
        otherVideo.currentTime = 0;
        otherVideo.play().catch(() => {});
        if (video2Ref.current) {
          video2Ref.current.style.opacity = '0';
        }
        otherVideo.style.opacity = '1';
        setActiveVideo(0);
        setTimeout(() => {
          fadeTriggeredRef.current = false;
        }, 1300);
      }
    };

    // Attach event listeners to both videos
    video1.addEventListener('timeupdate', handleTimeUpdate);
    video2.addEventListener('timeupdate', handleTimeUpdate);
    video1.addEventListener('ended', handleEnded1);
    video2.addEventListener('ended', handleEnded2);

    return () => {
      video1.removeEventListener('timeupdate', handleTimeUpdate);
      video2.removeEventListener('timeupdate', handleTimeUpdate);
      video1.removeEventListener('ended', handleEnded1);
      video2.removeEventListener('ended', handleEnded2);
      video2.removeEventListener('error', handleVideo2Error);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [secondVideoLoaded]); // Re-run when second video loads

  // Fallback to static background if video fails
  if (videoError) {
    return (
      <div 
        className="fixed inset-0 w-full h-full z-0 bg-linear-to-r from-background via-background/95 to-primary/5"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <video
        ref={video1Ref}
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out"
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
      {/* Lazy load second video only after first is ready */}
      {secondVideoLoaded && (
        <video
          ref={video2Ref}
          className="fixed inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out"
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
      )}
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
  const [splashVideoError, setSplashVideoError] = useState(false);
  
  // Use a ref to prevent multiple initializations even if component remounts (StrictMode protection)
  const bootstrappingInitRef = useRef(false);

  // Hidden warm-up grid to pre-initialize WebGL and shaders
  const WarmupGrid = () => (
    <div className="pointer-events-none fixed -z-10 opacity-0 w-px h-px overflow-hidden">
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
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 1000; // Minimum 1 second display for better UX

    // Track individual asset loading progress
    const assetProgress = {
      logoImage: 0,
      logoVideo: 0,
      buttonImages: 0,
      audio: 0,
    };

    const updateProgress = () => {
      if (cancelled) return;
      // Weighted progress: logo (20%), video (30%), buttons (20%), audio (30%)
      const totalProgress = 
        assetProgress.logoImage * 0.2 +
        assetProgress.logoVideo * 0.3 +
        assetProgress.buttonImages * 0.2 +
        assetProgress.audio * 0.3;
      setBootProgress(Math.min(99, Math.round(totalProgress)));
    };

    const preloadImage = (src: string, onProgress?: (progress: number) => void) =>
      new Promise<void>((resolve) => {
        const img = new Image() as HTMLImageElement;
        let progress = 0;
        
        // Track loading progress if supported
        if ('decode' in img && typeof img.decode === 'function') {
          img.decode()
            .then(() => {
              progress = 100;
              onProgress?.(progress);
              resolve();
            })
            .catch(() => {
              // Fallback to onload
              img.onload = () => {
                progress = 100;
                onProgress?.(progress);
                resolve();
              };
              img.onerror = () => {
                onProgress?.(100); // Count as done even on error
                resolve();
              };
              img.src = src;
            });
        } else {
          img.onload = () => {
            progress = 100;
            onProgress?.(progress);
            resolve();
          };
          img.onerror = () => {
            onProgress?.(100); // Count as done even on error
            resolve();
          };
          img.src = src;
        }
      });

    const preloadVideo = (src: string, onProgress?: (progress: number) => void) =>
      new Promise<void>((resolve) => {
        const video = document.createElement('video');
        let progress = 0;
        
        const updateVideoProgress = () => {
          if (video.buffered.length > 0 && video.duration > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            progress = Math.min(100, Math.round((bufferedEnd / video.duration) * 100));
            onProgress?.(progress);
          }
        };

        const cleanup = () => {
          video.removeEventListener('loadeddata', handleLoaded);
          video.removeEventListener('progress', updateVideoProgress);
          video.removeEventListener('error', handleError);
        };

        const handleLoaded = () => {
          progress = 100;
          onProgress?.(progress);
          cleanup();
          resolve();
        };

        const handleError = () => {
          progress = 100; // Count as done even on error
          onProgress?.(progress);
          cleanup();
          resolve();
        };

        video.addEventListener('loadeddata', handleLoaded);
        video.addEventListener('progress', updateVideoProgress);
        video.addEventListener('error', handleError);
        video.src = src;
        video.load();
      });

    // Preload all button images for mode selector (parallel)
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
    
    // Track button images progress
    let buttonImagesLoaded = 0;
    const buttonImagePromises = buttonImages.map(img => 
      preloadImage(img, () => {
        buttonImagesLoaded++;
        assetProgress.buttonImages = Math.round((buttonImagesLoaded / buttonImages.length) * 100);
        updateProgress();
      })
    );

    // Preload critical assets in parallel with progress tracking
    const imagePromise = preloadImage('/logo/ReflexIcon.jpg', (progress) => {
      assetProgress.logoImage = progress;
      updateProgress();
    });

    const videoPromise = preloadVideo('/animation/ReflexIconAnimated.mp4', (progress) => {
      assetProgress.logoVideo = progress;
      updateProgress();
    });

    const audioPromise = preloadAudioAssets().then(() => {
      assetProgress.audio = 100;
      updateProgress();
    });

    // Preload game route and 3D bundle in the background while splash is showing
    try {
      router.prefetch('/game');
    } catch {
      // Ignore prefetch errors – it will still load on first navigation.
    }

    // Wait for all assets and minimum display time
    Promise.all([
      imagePromise, 
      videoPromise, 
      audioPromise, 
      Promise.all(buttonImagePromises),
      new Promise<void>((resolve) => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
        setTimeout(resolve, remaining);
      })
    ]).then(() => {
      if (!cancelled) {
        setBootProgress(100);
        // Small delay to show 100% before hiding
        setTimeout(() => {
          if (!cancelled) {
            setBootstrapping(false);
            // Set sessionStorage flag ONLY after all assets are successfully preloaded
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('reflex_boot_done', '1');
            }
          }
        }, 200);
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

  // Handle skip loading (Space or Enter key) - MUST be before any conditional returns
  useEffect(() => {
    if (!bootstrapping) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setBootstrapping(false);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('reflex_boot_done', '1');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [bootstrapping]);

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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden"
          role="status"
          aria-live="polite"
          aria-label={statusLabel}
        >
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

            <div 
              className="w-56 sm:w-72 border-2 border-primary bg-black rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={bootProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Loading progress: ${bootProgress}%`}
            >
              <div
                className="h-3 bg-primary transition-all duration-200"
                style={{ width: `${bootProgress}%` }}
              />
            </div>

            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono tracking-wide" aria-live="polite">
              {bootProgress}%
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
              Press Space or Enter to skip
            </p>
          </div>
        </div>
      );
    }

    // Full animated splash
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden"
        role="status"
        aria-live="polite"
        aria-label={t(language, 'loading.engine')}
      >
        {/* Hidden warm-up grid runs behind splash to pre-initialize WebGL */}
        <WarmupGrid />
        <div className="relative w-full h-full flex items-center justify-center">
          {splashVideoError ? (
            // Fallback to static image if video fails
            <img
              src="/logo/ReflexIcon.jpg"
              alt="Reflex This"
              className="max-w-[520px] w-[70vw] max-h-[70vh] rounded-xl shadow-2xl shadow-primary/40 border-4 border-primary/60 bg-black/80 object-contain"
            />
          ) : (
            <video
              className="max-w-[520px] w-[70vw] max-h-[70vh] rounded-xl shadow-2xl shadow-primary/40 border-4 border-primary/60 bg-black/80 object-contain"
              src="/animation/ReflexIconAnimated.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onError={() => setSplashVideoError(true)}
              style={{
                transform: 'translateZ(0)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
              }}
              aria-hidden="true"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

          {/* Boot progress indicator + tips */}
          <div className="pointer-events-none absolute bottom-10 w-full flex flex-col items-center gap-3 px-4">
            <div 
              className="w-56 sm:w-72 border-2 border-primary/70 bg-black/70 rounded-full overflow-hidden shadow-lg shadow-primary/30"
              role="progressbar"
              aria-valuenow={bootProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Loading progress: ${bootProgress}%`}
            >
              <div
                className="h-3 bg-linear-to-r from-primary via-secondary to-chart-3 relative transition-all duration-200"
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
            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono tracking-wide" aria-live="polite">
              {statusLabel} {bootProgress}%
            </p>
            <p className="text-[11px] sm:text-xs text-foreground/70 font-mono text-center max-w-md" aria-live="polite">
              {LOADING_TIPS[bootTipIndex]}
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
              Press Space or Enter to skip
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
      <div className={`fixed inset-0 z-1 ${reducedEffects ? 'bg-black/60' : 'bg-black/40'}`} aria-hidden="true" />
      
      <main className="relative z-10 flex flex-col items-center justify-between flex-1 w-full max-w-4xl text-center py-4">
        {/* Center content area */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          {/* Hero Section - Matches demo mode width for symmetry */}
          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6 w-full max-w-2xl mx-auto">
          {/* Subtitle above title */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-2xl mx-auto">
            {t(language, 'landing.subtitle')}
          </p>
          {/* Main title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-primary text-glow mb-2 sm:mb-4 tracking-tight px-4 sm:px-6 py-2 sm:py-3 block w-full border-3 sm:border-4 border-primary rounded-lg">
            {t(language, 'landing.title')}
          </h1>
        </div>
        
        {/* Demo Mode - only show once the demo canvas has mounted */}
        {!showMode && !showStats && (
          <div className={`mb-6 w-full max-w-2xl mx-auto transition-opacity duration-300 ${demoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
          <div className="mb-6 w-full max-w-2xl mx-auto">
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
          <div className="flex flex-row gap-2 sm:gap-3 items-center justify-center w-full max-w-2xl mx-auto">
            <Link 
              href="/game"
              onClick={(e) => {
                e.preventDefault();
                setShowMode(true);
              }}
              className="group relative inline-flex items-center justify-center flex-1 min-w-0 min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-bold border-4 border-primary bg-primary text-white transition-all duration-100 hover:border-primary hover:bg-primary/80 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
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
              className="inline-flex items-center justify-center flex-1 min-w-0 min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
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
              className="inline-flex items-center justify-center flex-1 min-w-0 min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border whitespace-nowrap overflow-hidden"
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
              className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 text-foreground transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
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
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </RippleButton>
          </div>
        )}
        </div>
      </main>

      {/* WarmupGrid is already rendered during splash, no need to duplicate */}

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
              className="text-2xl sm:text-3xl font-bold text-foreground mb-4 pixel-border px-4 py-2 inline-block wrap-break-word"
              style={{ borderColor: '#3E7CAC' }}
            >
              {t(language, 'landing.exitConfirm.title')}
            </h2>
            <p className="text-sm text-foreground/80 mb-6 wrap-break-word">
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
