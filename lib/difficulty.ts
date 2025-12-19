/**
 * Difficulty preset system for ReflexThis game
 */

export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'nightmare';

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
    minDuration: 1200, // Minimum 1200ms
    maxButtons: 3, // Max 3 buttons at once
    speedIncrease: 0.3, // Slower difficulty increase
    description: 'Perfect for beginners. More time to react, fewer buttons.',
  },
  medium: {
    name: 'Medium',
    baseDuration: 1500, // 1.5 seconds - standard
    minDuration: 800, // Minimum 800ms
    maxButtons: 4, // Max 4 buttons at once
    speedIncrease: 0.5, // Moderate difficulty increase
    description: 'Balanced difficulty. Good for improving reflexes.',
  },
  hard: {
    name: 'Hard',
    baseDuration: 999, // 999ms - challenging
    minDuration: 666, // Minimum 666ms
    maxButtons: 5, // Max 5 buttons at once
    speedIncrease: 0.7, // Fast difficulty increase
    description: 'Extreme challenge. For reflex masters only!',
  },
  nightmare: {
    name: 'Nightmare',
    baseDuration: 666, // 666ms - brutal from the start
    minDuration: 420, // Minimum 420ms
    maxButtons: 10, // All buttons - maximum chaos
    speedIncrease: 0.85, // Very fast difficulty increase
    description: 'Brutal challenge for elite players only. Extreme speed and maximum buttons.',
  },
};

/**
 * Calculate highlight duration based on combo and difficulty preset
 * Reaction time scales with combo: at combo 100, duration reaches minDuration
 * @param combo Current combo count (used for scaling instead of score)
 * @param preset Difficulty preset
 * @param adaptiveMultiplier Optional adaptive difficulty multiplier (default: 1.0)
 */
export function getHighlightDurationForDifficulty(
  combo: number,
  preset: DifficultyPreset,
  adaptiveMultiplier: number = 1.0
): number {
  const config = DIFFICULTY_PRESETS[preset];
  
  // Calculate combo-based scaling: at combo 100, we reach minDuration
  // Linear interpolation from baseDuration (combo 0) to minDuration (combo 100)
  const comboProgress = Math.min(1.0, combo / 100); // 0.0 at combo 0, 1.0 at combo 100
  const durationRange = config.baseDuration - config.minDuration;
  const comboBasedDuration = config.baseDuration - (durationRange * comboProgress);
  
  // Apply adaptive multiplier: < 1.0 = easier (longer duration), > 1.0 = harder (shorter duration)
  // Lower multiplier = longer duration (easier)
  const finalDuration = comboBasedDuration / adaptiveMultiplier;
  
  // Ensure we never go below minDuration
  return Math.max(config.minDuration, finalDuration);
}

/**
 * Get number of buttons to highlight based on combo and difficulty preset
 * Button count scales with combo: higher combos = more buttons
 * @param combo Current combo count (used for scaling instead of score)
 * @param preset Difficulty preset
 * @param adaptiveMultiplier Optional adaptive difficulty multiplier (default: 1.0)
 */
export function getButtonsToHighlightForDifficulty(
  combo: number,
  preset: DifficultyPreset,
  adaptiveMultiplier: number = 1.0
): number {
  const config = DIFFICULTY_PRESETS[preset];
  const adjustedMaxButtons = Math.min(10, Math.ceil(config.maxButtons * adaptiveMultiplier));
  
  // Apply adaptive multiplier to combo for scaling
  const adjustedCombo = combo * adaptiveMultiplier;
  
  if (preset === 'easy') {
    // Easy: Start with 1, occasionally 2 after combo 5
    if (adjustedCombo < 5) return 1;
    const shouldIncrease = adaptiveMultiplier > 1.2;
    return Math.random() < (shouldIncrease ? 0.5 : 0.3) ? 2 : 1;
  }
  
  if (preset === 'medium') {
    // Medium: Progressive behavior based on combo
    if (adjustedCombo <= 8) return 1;
    if (adjustedCombo <= 15) return Math.random() < 0.5 ? 1 : 2;
    return Math.floor(Math.random() * adjustedMaxButtons) + 1;
  }
  
  if (preset === 'hard') {
    // Hard: Multiple buttons appear sooner
    if (adjustedCombo < 4) return 1;
    if (adjustedCombo < 8) return Math.random() < 0.5 ? 1 : 2;
    return Math.floor(Math.random() * adjustedMaxButtons) + 1;
  }
  
  if (preset === 'nightmare') {
    // Nightmare: Multiple buttons appear almost immediately
    if (adjustedCombo < 2) return 1;
    if (adjustedCombo < 5) return Math.random() < 0.6 ? 2 : 1;
    return Math.floor(Math.random() * adjustedMaxButtons) + 1;
  }
  
  // Default: Original progressive behavior (should not reach here)
  if (adjustedCombo <= 8) return 1;
  if (adjustedCombo <= 15) return Math.random() < 0.5 ? 1 : 2;
  return Math.floor(Math.random() * adjustedMaxButtons) + 1;
}

