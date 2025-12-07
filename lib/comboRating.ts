/**
 * Combo Rating System
 * Inspired by games like Devil May Cry, Bayonetta, and fighting games
 * 
 * Rating Scale: D → C → B → A → A+ → S → SS → SSS
 * 
 * Factors considered:
 * - Combo length (primary factor)
 * - Average reaction time (consistency)
 * - Perfect hit ratio (reactions < 150ms)
 * - Difficulty level (adjusted thresholds)
 */

import type { DifficultyPreset } from './difficulty';

export type ComboRating = 'D' | 'C' | 'B' | 'A' | 'A+' | 'S' | 'SS' | 'SSS';

export interface ComboRatingFactors {
  combo: number;
  averageReactionTime: number | null;
  perfectHitCount: number;
  totalHits: number;
  difficulty: DifficultyPreset;
}

export interface ComboRatingResult {
  rating: ComboRating;
  score: number; // 0-100 score for this rating
  nextRatingThreshold: number | null; // Score needed for next rating
  factors: {
    comboScore: number;
    speedScore: number;
    consistencyScore: number;
    perfectHitScore: number;
  };
}

/**
 * Get color for combo rating (for visual feedback)
 */
export function getRatingColor(rating: ComboRating): string {
  switch (rating) {
    case 'D': return '#888888'; // Gray
    case 'C': return '#4a9eff'; // Blue
    case 'B': return '#00ff9f'; // Green/Cyan
    case 'A': return '#ffff00'; // Yellow
    case 'A+': return '#ff8800'; // Orange
    case 'S': return '#ff00ff'; // Magenta
    case 'SS': return '#ff0088'; // Pink
    case 'SSS': return '#ff0000'; // Red
    default: return '#ffffff';
  }
}

/**
 * Get rating display name with styling info
 */
export function getRatingDisplay(rating: ComboRating): {
  label: string;
  color: string;
  glowIntensity: number;
} {
  const color = getRatingColor(rating);
  let glowIntensity = 1;
  
  // Higher ratings get more intense glow
  if (rating === 'SSS') glowIntensity = 3;
  else if (rating === 'SS') glowIntensity = 2.5;
  else if (rating === 'S') glowIntensity = 2;
  else if (rating === 'A+') glowIntensity = 1.5;
  else glowIntensity = 1;

  return {
    label: rating,
    color,
    glowIntensity,
  };
}

/**
 * Calculate combo rating based on multiple factors
 * 
 * Scoring breakdown:
 * - Combo Length: 0-50 points (primary factor)
 * - Speed: 0-25 points (based on average reaction time)
 * - Consistency: 0-15 points (based on reaction time variance)
 * - Perfect Hits: 0-10 points (ratio of perfect hits)
 * 
 * Total: 0-100 points
 */
export function calculateComboRating(factors: ComboRatingFactors): ComboRatingResult {
  const { combo, averageReactionTime, perfectHitCount, totalHits, difficulty } = factors;

  // Difficulty multipliers (harder difficulties need less to achieve same rating)
  const difficultyMultiplier: Record<DifficultyPreset, number> = {
    easy: 0.7,    // Need 30% more to achieve same rating
    medium: 1.0,  // Baseline
    hard: 1.3,    // Need 30% less to achieve same rating
    nightmare: 1.5, // Need 50% less to achieve same rating
  };
  const diffMult = difficultyMultiplier[difficulty];

  // 1. Combo Length Score (0-50 points)
  // Higher combos = more points, with diminishing returns
  const comboScore = Math.min(50, Math.floor(combo * 0.5 * diffMult));
  
  // 2. Speed Score (0-25 points)
  // Faster average reaction time = more points
  let speedScore = 0;
  if (averageReactionTime !== null && averageReactionTime > 0) {
    // Perfect speed (<150ms) = 25 points
    // Slow speed (>500ms) = 0 points
    // Linear interpolation
    const normalizedSpeed = Math.max(0, Math.min(1, (500 - averageReactionTime) / 350));
    speedScore = Math.floor(normalizedSpeed * 25);
  }

  // 3. Consistency Score (0-15 points)
  // This would require tracking reaction time variance
  // For now, we'll use a simplified version based on perfect hit ratio
  const consistencyScore = Math.floor((perfectHitCount / Math.max(1, totalHits)) * 15);

  // 4. Perfect Hit Score (0-10 points)
  // Ratio of perfect hits (<150ms reactions)
  const perfectHitRatio = perfectHitCount / Math.max(1, totalHits);
  const perfectHitScore = Math.floor(perfectHitRatio * 10);

  // Total score
  const totalScore = comboScore + speedScore + consistencyScore + perfectHitScore;

  // Determine rating based on total score
  let rating: ComboRating;
  let nextThreshold: number | null = null;

  if (totalScore >= 90) {
    rating = 'SSS';
    nextThreshold = null; // Max rating
  } else if (totalScore >= 80) {
    rating = 'SS';
    nextThreshold = 90;
  } else if (totalScore >= 70) {
    rating = 'S';
    nextThreshold = 80;
  } else if (totalScore >= 60) {
    rating = 'A+';
    nextThreshold = 70;
  } else if (totalScore >= 50) {
    rating = 'A';
    nextThreshold = 60;
  } else if (totalScore >= 35) {
    rating = 'B';
    nextThreshold = 50;
  } else if (totalScore >= 20) {
    rating = 'C';
    nextThreshold = 35;
  } else {
    rating = 'D';
    nextThreshold = 20;
  }

  return {
    rating,
    score: totalScore,
    nextRatingThreshold: nextThreshold,
    factors: {
      comboScore,
      speedScore,
      consistencyScore,
      perfectHitScore,
    },
  };
}

/**
 * Simplified rating calculation based primarily on combo length
 * Use this when detailed reaction time data isn't available
 */
export function getSimpleComboRating(
  combo: number,
  difficulty: DifficultyPreset = 'medium'
): ComboRating {
  const difficultyMultiplier: Record<DifficultyPreset, number> = {
    easy: 0.7,
    medium: 1.0,
    hard: 1.3,
    nightmare: 1.5,
  };
  const diffMult = difficultyMultiplier[difficulty];
  const adjustedCombo = combo * diffMult;

  if (adjustedCombo >= 100) return 'SSS';
  if (adjustedCombo >= 75) return 'SS';
  if (adjustedCombo >= 50) return 'S';
  if (adjustedCombo >= 35) return 'A+';
  if (adjustedCombo >= 25) return 'A';
  if (adjustedCombo >= 15) return 'B';
  if (adjustedCombo >= 8) return 'C';
  return 'D';
}

