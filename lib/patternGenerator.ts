/**
 * Pattern generation system for ReflexThis
 * Creates interesting button patterns instead of random selection
 */

// Button grid layout: 3-4-3
// Row 0: [1, 2, 3]
// Row 1: [4, 5, 6, 7]
// Row 2: [8, 9, 10]

export type PatternType = 
  | 'line-horizontal'
  | 'line-vertical'
  | 'line-diagonal'
  | 'shape-l'
  | 'shape-t'
  | 'shape-cross'
  | 'shape-corner'
  | 'sweep-left-right'
  | 'sweep-top-bottom'
  | 'cluster'
  | 'random';

export interface Pattern {
  type: PatternType;
  buttons: number[];
  bonusMultiplier: number; // Bonus for completing pattern quickly
  bonusButtonId: number | null; // Optional golden highlight button within the pattern
}

// Grid layout for pattern generation
const GRID_LAYOUT = [
  [1, 2, 3],       // Row 0
  [4, 5, 6, 7],   // Row 1
  [8, 9, 10],     // Row 2
];

/**
 * Generate horizontal line pattern
 */
function generateHorizontalLine(): number[] {
  const row = Math.floor(Math.random() * GRID_LAYOUT.length);
  return [...GRID_LAYOUT[row]];
}

/**
 * Generate vertical line pattern (through middle column)
 */
function generateVerticalLine(): number[] {
  // Vertical lines are tricky with 3-4-3 layout
  // We can create pseudo-vertical lines using middle buttons
  const patterns = [
    [2, 5, 9],      // Middle column (approximate)
    [1, 4, 8],     // Left column
    [3, 7, 10],    // Right column
    [2, 6],        // Top-middle to middle-middle
    [5, 9],        // Middle-middle to bottom-middle
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate diagonal line pattern
 */
function generateDiagonalLine(): number[] {
  const patterns = [
    [1, 5, 10],    // Top-left to bottom-right (diagonal)
    [3, 6, 8],     // Top-right to bottom-left (diagonal)
    [1, 4],        // Top-left to middle-left
    [3, 7],        // Top-right to middle-right
    [4, 8],        // Middle-left to bottom-left
    [7, 10],       // Middle-right to bottom-right
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate L-shape pattern
 * L-shapes can be in various orientations
 */
function generateLShape(): number[] {
  const patterns = [
    [2, 5, 8, 9, 10],  // Normal L: top-middle (2) down to middle-middle (5), then across bottom (8, 9, 10)
    [2, 6, 10, 9, 8],  // Mirrored L: top-middle (2) down to middle-right-center (6), then across bottom reverse (10, 9, 8)
    [1, 4, 8, 9, 10],  // Large L: top-left corner down to middle-left, then across bottom
    [3, 7, 8, 9, 10],  // Large L: top-right corner down to middle-right, then across bottom
    [1, 2, 4],         // Small L: top-left corner
    [2, 3, 7],         // Small L: top-right corner
    [4, 5, 8],         // Small L: middle-left to bottom-left
    [6, 7, 10],        // Small L: middle-right to bottom-right
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate T-shape pattern
 * T-shapes: top to bottom and reversed (bottom to top)
 */
function generateTShape(): number[] {
  const patterns = [
    [1, 2, 3, 9],   // T top to bottom: top row (1, 2, 3) + bottom middle (9)
    [2, 8, 9, 10],  // T reversed (bottom to top): top middle (2) + bottom row (8, 9, 10)
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate cross pattern
 * Cross pattern: 3 top, 2 middle (center 2), 3 bottom
 * This creates a clear cross shape across the grid
 * Top: [1, 2, 3], Middle center: [5, 6], Bottom: [8, 9, 10]
 */
function generateCross(): number[] {
  // Standard cross: top row (3) + middle center 2 + bottom row (3)
  // This forms a clear cross pattern: 3-2-3
  return [1, 3, 5, 6, 8, 10];
}

/**
 * Generate corner pattern
 */
function generateCorner(): number[] {
  const patterns = [
    [1, 2, 4],     // Top-left corner
    [2, 3, 7],     // Top-right corner
    [4, 5, 8],     // Bottom-left corner
    [6, 7, 10],    // Bottom-right corner
    [1, 4],        // Left corner (top)
    [3, 7],        // Right corner (top)
    [8, 9],        // Left corner (bottom)
    [9, 10],       // Right corner (bottom)
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate sweep pattern (left-to-right or top-to-bottom)
 */
function generateSweepLeftRight(): number[] {
  // Sweep across rows
  const patterns = [
    [1, 2, 3],           // Top row sweep
    [4, 5, 6, 7],        // Middle row sweep
    [8, 9, 10],          // Bottom row sweep
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateSweepTopBottom(): number[] {
  // Sweep down columns (approximate)
  const patterns = [
    [1, 4, 8],           // Left column
    [2, 5, 9],           // Middle column
    [3, 7, 10],          // Right column
    [1, 5, 10],          // Diagonal sweep
    [3, 6, 8],           // Reverse diagonal sweep
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate cluster pattern (adjacent buttons)
 */
function generateCluster(): number[] {
  // Clusters of 2-4 adjacent buttons
  const clusters = [
    // Top row clusters
    [1, 2],
    [2, 3],
    [1, 2, 4],
    [2, 3, 7],
    // Middle row clusters
    [4, 5],
    [5, 6],
    [6, 7],
    [4, 5, 8],
    [5, 6, 9],
    [6, 7, 10],
    // Bottom row clusters
    [8, 9],
    [9, 10],
    [8, 9, 5],
    [9, 10, 7],
    // Cross clusters
    [2, 5],
    [5, 6],
    [5, 9],
    [6, 7],
  ];
  return clusters[Math.floor(Math.random() * clusters.length)];
}

/**
 * Generate a pattern based on type
 */
function generatePatternByType(type: PatternType): number[] {
  switch (type) {
    case 'line-horizontal':
      return generateHorizontalLine();
    case 'line-vertical':
      return generateVerticalLine();
    case 'line-diagonal':
      return generateDiagonalLine();
    case 'shape-l':
      return generateLShape();
    case 'shape-t':
      return generateTShape();
    case 'shape-cross':
      return generateCross();
    case 'shape-corner':
      return generateCorner();
    case 'sweep-left-right':
      return generateSweepLeftRight();
    case 'sweep-top-bottom':
      return generateSweepTopBottom();
    case 'cluster':
      return generateCluster();
    case 'random':
    default:
      // Fallback to random selection
      const allButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...allButtons].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
  }
}

/**
 * Get bonus multiplier for pattern type
 */
function getPatternBonusMultiplier(type: PatternType): number {
  switch (type) {
    case 'line-horizontal':
    case 'line-vertical':
    case 'line-diagonal':
      return 1.2; // 20% bonus for lines
    case 'shape-l':
    case 'shape-t':
      return 1.3; // 30% bonus for shapes
    case 'shape-cross':
      return 1.4; // 40% bonus for cross
    case 'shape-corner':
      return 1.15; // 15% bonus for corners
    case 'sweep-left-right':
    case 'sweep-top-bottom':
      return 1.25; // 25% bonus for sweeps
    case 'cluster':
      return 1.1; // 10% bonus for clusters
    case 'random':
    default:
      return 1.0; // No bonus for random
  }
}

/**
 * Select appropriate pattern type based on score milestones
 * At score milestones (500, 1500, 2500, etc.), all patterns become available
 */
function selectPatternType(
  targetButtonCount: number,
  score: number
): PatternType {
  const patternOptions: PatternType[] = [];
  
  // Score milestones: 500, 1500, 2500, 3500, etc.
  // At each milestone, unlock more patterns
  const milestone = Math.floor(score / 500);
  
  if (milestone === 0) {
    // Score < 500: Basic patterns only
    patternOptions.push(
      'line-horizontal',
      'sweep-left-right',
      'sweep-top-bottom',
      'random'
    );
  } else if (milestone === 1) {
    // Score 500-1499: Add T-shapes
    patternOptions.push(
      'line-horizontal',
      'sweep-left-right',
      'sweep-top-bottom',
      'shape-t',
      'random'
    );
  } else if (milestone === 2) {
    // Score 1500-2499: Add L-shapes
    patternOptions.push(
      'line-horizontal',
      'sweep-left-right',
      'sweep-top-bottom',
      'shape-t',
      'shape-l',
      'random'
    );
  } else {
    // Score 2500+: All patterns available (including Cross)
    patternOptions.push(
      'line-horizontal',
      'sweep-left-right',
      'sweep-top-bottom',
      'shape-t',
      'shape-l',
      'shape-cross',
      'random'
    );
  }
  
  // Select random pattern from available options
  return patternOptions[Math.floor(Math.random() * patternOptions.length)];
}

/**
 * Generate a pattern for the given button count
 * @param targetButtonCount - Desired number of buttons in pattern
 * @param score - Current game score (affects pattern selection)
 * @param exclude - Button IDs to exclude (for avoiding recent patterns)
 * @param shouldIncludeBonus - Whether to include a bonus button within the pattern
 * @returns Pattern object with buttons, bonus multiplier, and optional bonus button
 */
export function generatePattern(
  targetButtonCount: number,
  score: number = 0,
  exclude: number[] = [],
  shouldIncludeBonus: boolean = false
): Pattern {
  // Select pattern type
  const patternType = selectPatternType(targetButtonCount, score);
  
  // Generate buttons for pattern
  let buttons = generatePatternByType(patternType);
  
  // For recognizable patterns (L, cross, T), preserve the exact pattern - don't modify it
  const isRecognizablePattern = patternType === 'shape-l' || patternType === 'shape-cross' || patternType === 'shape-t';
  
  if (isRecognizablePattern) {
    // For recognizable patterns, use the exact buttons from the pattern generator
    // Don't filter, trim, or add buttons - the pattern must be preserved exactly
    // This ensures L-shapes always show as L-shapes, cross always shows as cross, etc.
  } else {
    // For non-recognizable patterns, we can adjust to match target count
    
    // Filter out excluded buttons if possible (but only if we have enough left)
    if (exclude.length > 0 && buttons.length > 1) {
      const filtered = buttons.filter(id => !exclude.includes(id));
      // Only use filtered if we still have enough buttons to maintain pattern integrity
      if (filtered.length >= Math.max(1, Math.floor(buttons.length * 0.7))) {
        buttons = filtered;
      }
    }
    
    // Adjust button count to match target (only for non-recognizable patterns)
    if (buttons.length > targetButtonCount) {
      if (buttons.length <= targetButtonCount + 2) {
        // Keep pattern if it's close to target (within 2 buttons)
      } else {
        // Trim to target if pattern is much larger
        buttons = buttons.slice(0, targetButtonCount);
      }
    }
    
    // If we have fewer buttons than target, fill with random (excluding already selected and excluded)
    if (buttons.length < targetButtonCount) {
      const available = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
        id => !buttons.includes(id) && !exclude.includes(id)
      );
      const needed = targetButtonCount - buttons.length;
      if (available.length >= needed) {
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        buttons = [...buttons, ...shuffled.slice(0, needed)];
      }
    }
  }
  
  // Get bonus multiplier
  const bonusMultiplier = getPatternBonusMultiplier(patternType);
  
  // Optionally select a bonus button from within the pattern
  let bonusButtonId: number | null = null;
  if (shouldIncludeBonus && buttons.length > 0) {
    // Randomly select one of the pattern buttons as the bonus button
    const bonusIndex = Math.floor(Math.random() * buttons.length);
    bonusButtonId = buttons[bonusIndex];
  }
  
  return {
    type: patternType,
    buttons,
    bonusMultiplier,
    bonusButtonId,
  };
}

/**
 * Check if buttons form a recognizable pattern (for bonus scoring)
 */
export function detectPattern(buttons: number[]): PatternType | null {
  if (buttons.length < 2) return null;
  
  // Check for horizontal line
  const rows = [
    [1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10],
  ];
  for (const row of rows) {
    if (buttons.every(b => row.includes(b)) && buttons.length === row.length) {
      return 'line-horizontal';
    }
  }
  
  // Check for clusters (adjacent buttons)
  // This is a simplified check - could be enhanced
  const sorted = [...buttons].sort((a, b) => a - b);
  const isConsecutive = sorted.every((b, i) => i === 0 || b === sorted[i - 1] + 1);
  if (isConsecutive && buttons.length <= 4) {
    return 'cluster';
  }
  
  // Could add more pattern detection here
  
  return null;
}

