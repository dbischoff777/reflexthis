'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BuildInfo } from '@/components/BuildInfo';
import { DifficultySelector } from '@/components/DifficultySelector';
import { ModeSelector } from '@/components/ModeSelector';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { DemoMode } from '@/components/DemoMode';
import { LoadingScreen } from '@/components/LoadingScreen';
import SettingsModal from '@/components/SettingsModal';
import { DifficultyPreset } from '@/lib/difficulty';
import { GameMode } from '@/lib/gameModes';
import { GameProvider, useGameState } from '@/lib/GameContext';
import { stopBackgroundMusic, setGamePageActive, playMenuMusic, stopMenuMusic } from '@/lib/soundUtils';

function LandingPageContent() {
  const { difficulty, setDifficulty, gameMode, setGameMode, sessionStatistics, musicEnabled } = useGameState();
  const [showMode, setShowMode] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  // Handle ESC key for exit confirmation
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't interfere when modals are open
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

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden">
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl text-center">
        {/* Hero Section */}
        <div className="mb-8 space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-primary text-glow mb-4 tracking-tight pixel-border px-6 py-3 inline-block border-4 border-primary">
            REFLEX THIS
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Test your reflexes!
          </p>
        </div>
        
        {/* Demo Mode - Show when not selecting mode/difficulty */}
        {!showMode && !showDifficulty && !showStats && (
          <div className="mb-8 w-full">
            <DemoMode />
          </div>
        )}
        
        {/* Statistics Display */}
        {showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <SessionStatsDisplay stats={sessionStatistics} />
          </div>
        )}

        {/* Mode Selector */}
        {showMode && !showDifficulty && !showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <ModeSelector
              selected={gameMode}
              onSelect={(mode) => {
                setGameMode(mode);
                setShowMode(false);
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
                  // Proceed to difficulty selection
                  e.preventDefault();
                  setShowMode(false);
                  setShowDifficulty(true);
                } else if (!showMode && !showDifficulty) {
                  e.preventDefault();
                  setShowMode(true);
                }
              }}
              className="group relative inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-lg sm:text-xl font-bold border-4 border-primary bg-primary text-primary-foreground transition-all duration-100 hover:border-accent hover:bg-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
            >
              <span className="relative z-10">
                {showDifficulty ? 'Start Game' : showMode ? 'Select Difficulty' : 'Start Game'}
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
            className="inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 border-border bg-card text-foreground hover:border-primary hover:bg-primary/20 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
          >
            {showStats ? 'Hide Stats' : 'View Statistics'}
          </button>

          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowStats(false);
              setShowDifficulty(false);
              setShowMode(false);
            }}
            draggable={false}
            className="inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 border-border bg-card text-foreground hover:border-primary hover:bg-primary/20 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
          >
            Settings
          </button>

          <button
            onClick={() => setShowExitConfirm(true)}
            draggable={false}
            className="inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 border-destructive bg-card text-foreground hover:border-destructive hover:bg-destructive/20 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-destructive pixel-border"
          >
            Exit Game
          </button>
        </div>
      </main>

      {/* Unified Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border-4 border-destructive pixel-border p-4 sm:p-6 md:p-8 max-w-sm w-full mx-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-destructive mb-4 pixel-border px-4 py-2 inline-block">
              EXIT GAME?
            </h2>
            <p className="text-sm text-foreground/80 mb-6">
              Are you sure you want to exit the game?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-6 py-3 border-4 border-border bg-card text-foreground pixel-border font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                CANCEL
              </button>
              <button
                onClick={handleExit}
                className="px-6 py-3 border-4 border-destructive bg-destructive text-destructive-foreground pixel-border font-bold hover:bg-destructive/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-destructive"
              >
                EXIT
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
