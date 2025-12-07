/**
 * Advanced scoring system for ReflexThis
 * Implements multi-factor scoring with reaction time, combos, accuracy, consistency, difficulty, and mode multipliers
 */

import { DifficultyPreset } from './difficulty';
import { GameMode } from './gameModes';

export interface ScoringFactors {
  baseScore: number;
  comboMultiplier: number;
  accuracyBonus: number;
  consistencyBonus: number;
  difficultyMultiplier: number;
  modeMultiplier: number;
  totalScore: number;
}

export interface ScoreBreakdown {
  factors: ScoringFactors;
  perfectHitStreak: number;
  recentReactionTimes: number[];
}

/**
 * Advanced score calculator class
 */
export class ScoreCalculator {
  private recentReactionTimes: number[] = [];
  private perfectHitStreak: number = 0;
  private comboCount: number = 0;
  private difficulty: DifficultyPreset;
  private gameMode: GameMode;
  private readonly MAX_RECENT_TIMES = 10;

  constructor(difficulty: DifficultyPreset, gameMode: GameMode) {
    this.difficulty = difficulty;
    this.gameMode = gameMode;
  }

  /**
   * Calculate comprehensive score based on reaction time and game state
   */
  calculateScore(reactionTime: number, isCorrect: boolean, currentCombo: number): ScoringFactors {
    if (!isCorrect || reactionTime <= 0) {
      this.resetStreaks();
      return {
        baseScore: 0,
        comboMultiplier: 0,
        accuracyBonus: 0,
        consistencyBonus: 0,
        difficultyMultiplier: 0,
        modeMultiplier: 0,
        totalScore: 0,
      };
    }

    // Track reaction time for consistency calculations
    this.recentReactionTimes.push(reactionTime);
    if (this.recentReactionTimes.length > this.MAX_RECENT_TIMES) {
      this.recentReactionTimes.shift();
    }

    // Update combo count
    this.comboCount = currentCombo;

    // Update perfect hit streak
    if (reactionTime < 150) {
      this.perfectHitStreak++;
    } else {
      this.perfectHitStreak = 0;
    }

    // Calculate all scoring factors
    const baseScore = this.calculateBaseScore(reactionTime);
    const comboMultiplier = this.calculateComboMultiplier(currentCombo);
    const accuracyBonus = this.calculateAccuracyBonus();
    const consistencyBonus = this.calculateConsistencyBonus();
    const difficultyMultiplier = this.calculateDifficultyMultiplier();
    const modeMultiplier = this.calculateModeMultiplier();

    // Calculate total score
    const totalScore = Math.floor(
      baseScore * comboMultiplier * difficultyMultiplier * modeMultiplier +
      accuracyBonus +
      consistencyBonus
    );

    return {
      baseScore,
      comboMultiplier,
      accuracyBonus,
      consistencyBonus,
      difficultyMultiplier,
      modeMultiplier,
      totalScore,
    };
  }

  /**
   * Calculate base score from reaction time
   * Faster reactions = higher base score
   */
  private calculateBaseScore(reactionTime: number): number {
    // Perfect reaction (<150ms) = 100 base points
    if (reactionTime < 150) {
      return 100;
    }
    
    // Excellent reaction (150-200ms) = 80-100 points
    if (reactionTime < 200) {
      return 80 + (20 * (1 - (reactionTime - 150) / 50));
    }
    
    // Good reaction (200-350ms) = 50-80 points
    if (reactionTime < 350) {
      return 50 + (30 * (1 - (reactionTime - 200) / 150));
    }
    
    // Slow reaction (350-500ms) = 25-50 points
    if (reactionTime < 500) {
      return 25 + (25 * (1 - (reactionTime - 350) / 150));
    }
    
    // Very slow reaction (>500ms) = 10-25 points
    return Math.max(10, 25 - ((reactionTime - 500) / 100) * 3);
  }

  /**
   * Calculate enhanced combo multiplier with better scaling
   */
  private calculateComboMultiplier(combo: number): number {
    if (combo < 3) return 1.0;
    if (combo < 5) return 1.2;
    if (combo < 10) return 1.5;
    if (combo < 15) return 2.0;
    if (combo < 20) return 2.5;
    if (combo < 30) return 3.0;
    if (combo < 40) return 3.5;
    if (combo < 50) return 4.0;
    // Exponential scaling for very high combos
    return 4.0 + Math.min(2.0, (combo - 50) / 25);
  }

  /**
   * Calculate accuracy bonus for consecutive perfect hits
   */
  private calculateAccuracyBonus(): number {
    if (this.perfectHitStreak < 3) return 0;
    
    // Bonus scales with perfect hit streak
    // 3 perfect hits = 10 bonus, 5 = 25, 10 = 100, etc.
    if (this.perfectHitStreak < 5) {
      return 10 + (this.perfectHitStreak - 3) * 7.5;
    }
    if (this.perfectHitStreak < 10) {
      return 25 + (this.perfectHitStreak - 5) * 15;
    }
    // Exponential bonus for very long streaks
    return 100 + (this.perfectHitStreak - 10) * 20;
  }

  /**
   * Calculate consistency bonus for maintaining steady reaction times
   */
  private calculateConsistencyBonus(): number {
    if (this.recentReactionTimes.length < 5) return 0;
    
    // Calculate standard deviation of recent reaction times
    const mean = this.recentReactionTimes.reduce((sum, time) => sum + time, 0) / this.recentReactionTimes.length;
    const variance = this.recentReactionTimes.reduce((sum, time) => {
      return sum + Math.pow(time - mean, 2);
    }, 0) / this.recentReactionTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = more consistent = higher bonus
    // If stdDev is very low (<50ms), give significant bonus
    if (stdDev < 30) {
      return 50;
    }
    if (stdDev < 50) {
      return 30;
    }
    if (stdDev < 75) {
      return 15;
    }
    if (stdDev < 100) {
      return 5;
    }
    
    return 0;
  }

  /**
   * Calculate difficulty multiplier
   */
  private calculateDifficultyMultiplier(): number {
    switch (this.difficulty) {
      case 'easy':
        return 0.8; // Slightly lower scores on easy
      case 'medium':
        return 1.0; // Base multiplier
      case 'hard':
        return 1.3; // 30% bonus
      case 'nightmare':
        return 1.6; // 60% bonus
      default:
        return 1.0;
    }
  }

  /**
   * Calculate mode-specific multiplier
   */
  private calculateModeMultiplier(): number {
    switch (this.gameMode) {
      case 'reflex':
        return 1.0; // Base multiplier
      case 'survival':
        return 1.2; // 20% bonus for higher risk
      case 'nightmare':
        return 1.4; // 40% bonus for extreme difficulty
      case 'oddOneOut':
        return 1.1; // 10% bonus for pattern recognition
      case 'sequence':
        return 0.9; // Slightly lower (memory-based, not pure reflex)
      default:
        return 1.0;
    }
  }

  /**
   * Reset streaks when player makes a mistake
   */
  private resetStreaks(): void {
    this.perfectHitStreak = 0;
    // Don't reset recent reaction times - keep for consistency calculation
  }

  /**
   * Get current state for visualization
   */
  getBreakdown(): ScoreBreakdown {
    return {
      factors: {
        baseScore: 0,
        comboMultiplier: 0,
        accuracyBonus: 0,
        consistencyBonus: 0,
        difficultyMultiplier: this.calculateDifficultyMultiplier(),
        modeMultiplier: this.calculateModeMultiplier(),
        totalScore: 0,
      },
      perfectHitStreak: this.perfectHitStreak,
      recentReactionTimes: [...this.recentReactionTimes],
    };
  }

  /**
   * Reset calculator state (for new game)
   */
  reset(): void {
    this.recentReactionTimes = [];
    this.perfectHitStreak = 0;
    this.comboCount = 0;
  }
}

