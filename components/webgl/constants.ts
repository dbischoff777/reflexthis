// Button constants
export const BASE_DEPTH = 0.15;
export const MAX_DEPTH = 0.6;
export const DEBOUNCE_DELAY = 100;
export const BUTTON_SIZE = 0.85;  // Button size in 3D units - matches game proportions

// The actual game layout: 3-4-3 (10 buttons total)
export const GAME_LAYOUT = [
  [1, 2, 3],       // Top row: 3 buttons
  [4, 5, 6, 7],   // Middle row: 4 buttons
  [8, 9, 10],     // Bottom row: 3 buttons
];

// Color palette matching game theme
export const THEME_COLORS = {
  idle: { r: 0.0, g: 0.0, b: 0.6 },       // Deep blue (card color)
  hover: { r: 0.0, g: 0.5, b: 0.8 },      // Brighter blue
  primary: { r: 0.0, g: 1.0, b: 1.0 },    // Cyan (primary)
  secondary: { r: 1.0, g: 0.0, b: 1.0 },  // Magenta (secondary/accent)
  success: { r: 0.2, g: 0.9, b: 0.4 },    // Green
  error: { r: 1.0, g: 0.1, b: 0.1 },      // Red (destructive)
};

// Color palette for urgency states (cyan → magenta → red)
export const URGENCY_COLORS = {
  safe: { r: 0.0, g: 1.0, b: 1.0 },       // Cyan (primary)
  caution: { r: 0.5, g: 0.8, b: 1.0 },    // Light cyan-blue
  warning: { r: 1.0, g: 0.0, b: 1.0 },    // Magenta (secondary)
  danger: { r: 1.0, g: 0.2, b: 0.5 },     // Pink-red
  critical: { r: 1.0, g: 0.1, b: 0.2 },   // Deep red
};

