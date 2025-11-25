'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BuildInfo } from '@/components/BuildInfo';
import { DifficultySelector } from '@/components/DifficultySelector';
import { ModeSelector } from '@/components/ModeSelector';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { DemoMode } from '@/components/DemoMode';
import { LoadingScreen } from '@/components/LoadingScreen';
import { DifficultyPreset } from '@/lib/difficulty';
import { GameMode } from '@/lib/gameModes';
import { GameProvider, useGameState } from '@/lib/GameContext';
import { stopBackgroundMusic, setGamePageActive } from '@/lib/soundUtils';

function LandingPageContent() {
  const { difficulty, setDifficulty, gameMode, setGameMode, sessionStatistics } = useGameState();
  const [showMode, setShowMode] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isNavigatingToGame, setIsNavigatingToGame] = useState(false);

  // Ensure music is stopped on landing page and prevent any game sounds
  useEffect(() => {
    stopBackgroundMusic();
    // Mark that we're not on the game page to prevent sounds
    setGamePageActive(false);
    
    // Also stop on cleanup/unmount
    return () => {
      stopBackgroundMusic();
      setGamePageActive(false);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden">
      {isNavigatingToGame && (
        <LoadingScreen
          message="INITIALIZING"
          onComplete={() => {}}
        />
      )}
      
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
                  // Start game - show loading screen before navigation
                  e.preventDefault();
                  setIsNavigatingToGame(true);
                  // Navigate after loading screen shows
                  setTimeout(() => {
                    window.location.href = '/game';
                  }, 500);
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
            }}
            className="inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold border-4 border-border bg-card text-foreground hover:border-primary hover:bg-primary/20 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary pixel-border"
          >
            {showStats ? 'Hide Stats' : 'View Statistics'}
          </button>
        </div>
      </main>
      
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
