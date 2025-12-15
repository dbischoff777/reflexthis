/**
 * Difficulty preset system for Sequence game mode
 */

import { DifficultyPreset } from './difficulty';

export interface SequenceDifficultyConfig {
  name: string;
  sequenceDisplayDuration: number; // How long each button in sequence is shown (ms)
  sequenceGapDuration: number; // Gap between sequence buttons (ms)
  maxSequenceLength: number; // Maximum sequence length
  startingSequenceLength: number; // Starting sequence length
  sequenceIncreaseRate: number; // How fast sequence length increases (0-1)
  description: string;
}

export const SEQUENCE_DIFFICULTY_PRESETS: Record<DifficultyPreset, SequenceDifficultyConfig> = {
  easy: {
    name: 'Easy',
    sequenceDisplayDuration: 800, // 800ms per button
    sequenceGapDuration: 200, // 200ms gap
    maxSequenceLength: 8,
    startingSequenceLength: 3,
    sequenceIncreaseRate: 0.3, // Slow increase
    description: 'Longer display times, shorter sequences. Perfect for beginners.',
  },
  medium: {
    name: 'Medium',
    sequenceDisplayDuration: 600, // 600ms per button
    sequenceGapDuration: 150, // 150ms gap
    maxSequenceLength: 12,
    startingSequenceLength: 4,
    sequenceIncreaseRate: 0.5, // Moderate increase
    description: 'Balanced timing and sequence length. Good for practice.',
  },
  hard: {
    name: 'Hard',
    sequenceDisplayDuration: 400, // 400ms per button
    sequenceGapDuration: 100, // 100ms gap
    maxSequenceLength: 16,
    startingSequenceLength: 5,
    sequenceIncreaseRate: 0.7, // Fast increase
    description: 'Fast sequences, long patterns. For memory masters!',
  },
  nightmare: {
    name: 'Nightmare',
    sequenceDisplayDuration: 250, // Extremely fast - brutal
    sequenceGapDuration: 50, // Very short gap
    maxSequenceLength: 20, // Very long sequences
    startingSequenceLength: 6, // Start with longer sequences
    sequenceIncreaseRate: 0.85, // Very fast increase
    description: 'Brutal challenge for elite players only. Extreme speed and long sequences.',
  },
};

/**
 * Calculate sequence length based on score and difficulty preset
 */
export function getSequenceLengthForDifficulty(
  score: number,
  preset: DifficultyPreset
): number {
  const config = SEQUENCE_DIFFICULTY_PRESETS[preset];
  // Rebalanced growth: keep early game sequences stable for longer,
  // then increase length more gradually as score climbs.
  // - No growth before score 50
  // - After that, grow in steps of 50 score, scaled by preset rate
  const adjustedScore = Math.max(0, score - 50);
  const steps = Math.floor(adjustedScore / 50);
  const increase = steps * config.sequenceIncreaseRate;
  const length = Math.floor(config.startingSequenceLength + increase);
  return Math.min(length, config.maxSequenceLength);
}

/**
 * Get sequence display duration for difficulty
 */
export function getSequenceDisplayDuration(preset: DifficultyPreset): number {
  return SEQUENCE_DIFFICULTY_PRESETS[preset].sequenceDisplayDuration;
}

/**
 * Get sequence gap duration for difficulty
 */
export function getSequenceGapDuration(preset: DifficultyPreset): number {
  return SEQUENCE_DIFFICULTY_PRESETS[preset].sequenceGapDuration;
}

