/**
 * Difficulty preset system for ReflexThis game
 */

export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';

export interface DifficultyConfig {
  name: string;
  baseDuration: number; // Base highlight duration in ms
  minDuration: number; // Minimum highlight duration in ms
  maxButtons: number; // Maximum buttons to highlight simultaneously
  speedIncrease: number; // How fast difficulty increases (0-1)
  description: string;
}

export const DIFFICULTY_PRESETS: Record<DifficultyPreset, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    baseDuration: 2000, // 2 seconds - more time to react
    minDuration: 800, // Minimum 800ms
    maxButtons: 3, // Max 3 buttons at once
    speedIncrease: 0.3, // Slower difficulty increase
    description: 'Perfect for beginners. More time to react, fewer buttons.',
  },
  medium: {
    name: 'Medium',
    baseDuration: 1500, // 1.5 seconds - standard
    minDuration: 400, // Minimum 400ms
    maxButtons: 4, // Max 4 buttons at once
    speedIncrease: 0.5, // Moderate difficulty increase
    description: 'Balanced difficulty. Good for improving reflexes.',
  },
  hard: {
    name: 'Hard',
    baseDuration: 666, // 666ms - challenging
    minDuration: 250, // Minimum 250ms
    maxButtons: 5, // Max 5 buttons at once
    speedIncrease: 0.7, // Fast difficulty increase
    description: 'Extreme challenge. For reflex masters only!',
  },
  custom: {
    name: 'Custom',
    baseDuration: 2000, // Default progressive (original behavior)
    minDuration: 300, // Default minimum
    maxButtons: 4, // Default max
    speedIncrease: 0.7, // Original progressive scaling
    description: 'Progressive difficulty that scales with your score.',
  },
};

/**
 * Calculate highlight duration based on score and difficulty preset
 */
export function getHighlightDurationForDifficulty(
  score: number,
  preset: DifficultyPreset
): number {
  const config = DIFFICULTY_PRESETS[preset];
  const speedReduction = Math.min(0.8, score * 0.001 * config.speedIncrease);
  const duration = config.baseDuration * (1 - speedReduction);
  return Math.max(config.minDuration, duration);
}

/**
 * Get number of buttons to highlight based on score and difficulty preset
 */
export function getButtonsToHighlightForDifficulty(
  score: number,
  preset: DifficultyPreset
): number {
  const config = DIFFICULTY_PRESETS[preset];
  
  if (preset === 'easy') {
    // Easy: Start with 1, occasionally 2 after score 30
    if (score < 30) return 1;
    return Math.random() < 0.3 ? 2 : 1;
  }
  
  if (preset === 'medium') {
    // Medium: Original progressive behavior
    if (score <= 50) return 1;
    if (score <= 150) return Math.random() < 0.5 ? 1 : 2;
    return Math.floor(Math.random() * config.maxButtons) + 1;
  }
  
  if (preset === 'hard') {
    // Hard: Multiple buttons appear sooner
    if (score < 20) return 1;
    if (score < 50) return Math.random() < 0.5 ? 1 : 2;
    return Math.floor(Math.random() * config.maxButtons) + 1;
  }
  
  // Custom: Original progressive behavior
  if (score <= 50) return 1;
  if (score <= 150) return Math.random() < 0.5 ? 1 : 2;
  return Math.floor(Math.random() * config.maxButtons) + 1;
}

