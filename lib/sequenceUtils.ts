/**
 * Utility functions for Sequence game mode
 */

import { getRandomButtons } from './gameUtils';
import { DifficultyPreset } from './difficulty';
import {
  getSequenceLengthForDifficulty,
  getSequenceDisplayDuration,
  getSequenceGapDuration,
} from './sequenceDifficulty';

/**
 * Generate a random sequence of button IDs
 */
export function generateSequence(
  length: number,
  totalButtons: number = 10
): number[] {
  const sequence: number[] = [];
  for (let i = 0; i < length; i++) {
    // Allow same button to appear multiple times in sequence
    const randomButton = Math.floor(Math.random() * totalButtons) + 1;
    sequence.push(randomButton);
  }
  return sequence;
}

/**
 * Get sequence length based on score and difficulty
 */
export function getSequenceLength(
  score: number,
  difficulty: DifficultyPreset
): number {
  return getSequenceLengthForDifficulty(score, difficulty);
}

/**
 * Get timing for sequence display
 */
export function getSequenceTiming(difficulty: DifficultyPreset) {
  return {
    displayDuration: getSequenceDisplayDuration(difficulty),
    gapDuration: getSequenceGapDuration(difficulty),
  };
}

/**
 * Check if player's input matches the sequence
 */
export function checkSequence(
  playerSequence: number[],
  correctSequence: number[]
): boolean {
  if (playerSequence.length !== correctSequence.length) {
    return false;
  }
  return playerSequence.every((button, index) => button === correctSequence[index]);
}

