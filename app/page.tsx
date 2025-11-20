'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { BuildInfo } from '@/components/BuildInfo';
import { DifficultySelector } from '@/components/DifficultySelector';
import { SessionStatsDisplay } from '@/components/SessionStatsDisplay';
import { DifficultyPreset } from '@/lib/difficulty';
import { GameProvider, useGameState } from '@/lib/GameContext';
import { stopBackgroundMusic } from '@/lib/soundUtils';

function LandingPageContent() {
  const { difficulty, setDifficulty, sessionStatistics } = useGameState();
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Ensure music is stopped on landing page
  useEffect(() => {
    stopBackgroundMusic();
    
    // Also stop on cleanup/unmount
    return () => {
      stopBackgroundMusic();
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden">
      <CyberpunkBackground />
      
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl text-center">
        {/* Hero Section */}
        <div className="mb-8 space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-primary text-glow mb-4 tracking-tight">
            ReflexThis
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Test your reflexes in this cyberpunk-inspired game
          </p>
        </div>
        
        {/* Statistics Display */}
        {showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <SessionStatsDisplay stats={sessionStatistics} />
          </div>
        )}

        {/* Difficulty Selector */}
        {showDifficulty && !showStats && (
          <div className="mb-8 w-full max-w-2xl">
            <DifficultySelector
              selected={difficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {!showStats && (
            <Link 
              href="/game"
              onClick={(e) => {
                if (!showDifficulty) {
                  e.preventDefault();
                  setShowDifficulty(true);
                }
              }}
              className="group relative inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-lg sm:text-xl font-bold rounded-full bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <span className="relative z-10">
                {showDifficulty ? 'Start Game' : 'Select Difficulty & Play'}
              </span>
            </Link>
          )}

          <button
            onClick={() => {
              setShowStats(!showStats);
              setShowDifficulty(false);
            }}
            className="inline-flex items-center justify-center min-h-[56px] px-6 py-3 text-base sm:text-lg font-semibold rounded-full border-2 border-border bg-card/50 text-foreground hover:border-primary/50 hover:bg-card/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
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
