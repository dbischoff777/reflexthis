/**
 * Game utility functions for button highlighting and difficulty management
 */

/**
 * Get random buttons from available buttons, excluding specified ones
 * @param count - Number of buttons to select
 * @param totalButtons - Total number of buttons (default: 10)
 * @param exclude - Button IDs to exclude from selection
 * @returns Array of randomly selected button IDs
 */
export function getRandomButtons(
  count: number,
  totalButtons: number = 10,
  exclude: number[] = []
): number[] {
  const availableButtons = Array.from({ length: totalButtons }, (_, i) => i + 1).filter(
    (id) => !exclude.includes(id)
  );

  const result: number[] = [];

  for (let i = 0; i < count; i++) {
    if (availableButtons.length === 0) break;

    const randomIndex = Math.floor(Math.random() * availableButtons.length);
    const selectedButton = availableButtons[randomIndex];

    result.push(selectedButton);
    availableButtons.splice(randomIndex, 1);
  }

  return result;
}

/**
 * Determine how many buttons to highlight based on current score
 * @param score - Current game score
 * @returns Number of buttons to highlight (1-3)
 */
export function getButtonsToHighlight(score: number): number {
  if (score <= 50) {
    // Level 1: Always 1 button
    return 1;
  } else if (score <= 150) {
    // Level 2: Randomly 1 or 2 buttons
    return Math.random() < 0.5 ? 1 : 2;
  } else {
    // Level 3+: Randomly 1, 2, or 3 buttons
    return Math.floor(Math.random() * 3) + 1;
  }
}

/**
 * Calculate highlight duration based on score (progressive difficulty)
 * @param score - Current game score
 * @returns Duration in milliseconds (minimum 300ms)
 */
export function getHighlightDuration(score: number): number {
  // Base duration: 2000ms
  const baseDuration = 2000;
  const minDuration = 300;

  let speedReduction = 0;

  if (score <= 50) {
    // Base speed
    speedReduction = 0;
  } else if (score <= 100) {
    // 10% faster
    speedReduction = 0.1;
  } else if (score <= 200) {
    // 20% faster
    speedReduction = 0.2;
  } else {
    // Continue scaling up to 70% faster
    speedReduction = Math.min(0.7, 0.2 + (score - 200) * 0.001);
  }

  const duration = baseDuration * (1 - speedReduction);
  return Math.max(minDuration, duration);
}

/**
 * Calculate combo multiplier based on combo count
 * @param combo - Current combo count
 * @returns Multiplier (1x, 2x, 3x, etc.)
 */
export function getComboMultiplier(combo: number): number {
  if (combo < 5) return 1;
  if (combo < 10) return 2;
  if (combo < 20) return 3;
  if (combo < 30) return 4;
  return 5; // Max 5x multiplier
}

