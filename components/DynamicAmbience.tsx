'use client';

import { useGameState } from '@/lib/GameContext';
import { useEffect, useState } from 'react';

/**
 * DynamicAmbience component provides background atmosphere that reacts to game state.
 * Sits on top of the SinclairBackground but behind game content.
 */
export function DynamicAmbience() {
  const { combo, lives, gameOver, gameMode, score, highlightedButtons, difficulty } = useGameState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Calculate speed intensity based on score and difficulty
  const getSpeedIntensity = () => {
    const config = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.5 : difficulty === 'hard' ? 0.7 : 0.7;
    const speedReduction = Math.min(0.8, score * 0.001 * config);
    return speedReduction; // 0 = slow, 0.8 = very fast
  };

  // Determine state-based styles
  const getAmbienceState = () => {
    // Game Over: Dark ominous purple
    if (gameOver) {
      return {
        background: 'radial-gradient(circle at center, rgba(150, 0, 150, 0.6) 0%, rgba(80, 0, 80, 0.8) 80%, rgba(0, 0, 0, 0.9) 100%)',
        pulseClass: 'animate-bg-pulse-slow',
        borderColor: 'rgba(255, 0, 255, 0.6)'
      };
    }

    // Critical Lives (Survival Mode or 1 life left): Urgent Purple flashing
    const isCritical = (gameMode === 'survival' && lives === 1) || (lives === 1 && gameMode !== 'survival');
    if (isCritical) {
      return {
        background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.5) 0%, rgba(200, 0, 200, 0.3) 50%, transparent 80%)',
        pulseClass: 'animate-bg-pulse-fast',
        borderColor: 'rgba(255, 0, 255, 0.8)'
      };
    }

    const speedIntensity = getSpeedIntensity();
    const multipleButtons = highlightedButtons.length >= 2;
    
    // Multiple buttons + high speed: Intense purple/cyan
    if (multipleButtons && speedIntensity > 0.5) {
      return {
        background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.4) 0%, rgba(0, 255, 255, 0.3) 40%, rgba(150, 0, 255, 0.2) 70%, transparent 90%)',
        pulseClass: 'animate-bg-pulse-fast',
        borderColor: 'rgba(255, 0, 255, 0.7)'
      };
    }

    // Multiple buttons: Purple/Magenta tint
    if (multipleButtons) {
      return {
        background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.3) 0%, rgba(150, 0, 255, 0.2) 50%, transparent 80%)',
        pulseClass: 'animate-bg-pulse-medium',
        borderColor: 'rgba(255, 0, 255, 0.5)'
      };
    }

    // High speed (score-based): Cyan intensity increases
    if (speedIntensity > 0.5) {
      return {
        background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.35) 0%, rgba(0, 200, 255, 0.25) 50%, transparent 80%)',
        pulseClass: 'animate-bg-pulse-medium',
        borderColor: 'rgba(0, 255, 255, 0.5)'
      };
    }

    // High Combo: Purple/Cyan mix
    if (combo > 25) {
      return {
        background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.3) 0%, rgba(0, 255, 255, 0.2) 40%, rgba(150, 0, 255, 0.15) 70%, transparent 90%)',
        pulseClass: 'animate-bg-pulse-fast',
        borderColor: 'rgba(255, 0, 255, 0.6)'
      };
    }

    // Medium Combo: Purple/Cyan tint
    if (combo > 10) {
      return {
        background: 'radial-gradient(circle at center, rgba(255, 0, 255, 0.25) 0%, rgba(0, 255, 255, 0.15) 50%, transparent 80%)',
        pulseClass: 'animate-bg-pulse-medium',
        borderColor: 'rgba(255, 0, 255, 0.4)'
      };
    }

    // Low Combo: Magenta/Cyan tint
    if (combo > 3) {
      return {
        background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.25) 0%, rgba(255, 0, 255, 0.15) 50%, transparent 80%)',
        pulseClass: 'animate-bg-pulse-medium',
        borderColor: 'rgba(0, 255, 255, 0.4)'
      };
    }

    // Default: Subtle Cyan/Blue
    return {
      background: 'radial-gradient(circle at center, rgba(0, 0, 255, 0.15) 0%, rgba(0, 100, 200, 0.1) 50%, transparent 80%)',
      pulseClass: 'animate-bg-pulse-slow',
      borderColor: 'transparent'
    };
  };

  const state = getAmbienceState();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000 ease-in-out overflow-hidden">
      {/* Base background color overlay - always visible */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{ 
          background: state.background
        }}
      />
      
      {/* Central Glow with pulse animation */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${state.pulseClass}`}
        style={{ 
          background: state.background
        }}
      />
      
      {/* Edge Warning/Glow - only when border color is set */}
      {state.borderColor !== 'transparent' && (
        <div 
          className="absolute inset-0 transition-colors duration-500"
          style={{ 
            boxShadow: `inset 0 0 200px 80px ${state.borderColor}`,
            opacity: 0.6,
            filter: 'blur(80px)'
          }}
        />
      )}
    </div>
  );
}

