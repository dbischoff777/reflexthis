import * as THREE from 'three';
import { URGENCY_COLORS } from './constants';

/**
 * Get urgency color based on progress (0-1)
 */
export function getUrgencyColor(progress: number): { r: number; g: number; b: number } {
  if (progress < 0.25) return URGENCY_COLORS.safe;
  if (progress < 0.5) {
    const t = (progress - 0.25) / 0.25;
    return lerpColor(URGENCY_COLORS.safe, URGENCY_COLORS.caution, t);
  }
  if (progress < 0.75) {
    const t = (progress - 0.5) / 0.25;
    return lerpColor(URGENCY_COLORS.caution, URGENCY_COLORS.warning, t);
  }
  if (progress < 0.9) {
    const t = (progress - 0.75) / 0.15;
    return lerpColor(URGENCY_COLORS.warning, URGENCY_COLORS.danger, t);
  }
  const t = (progress - 0.9) / 0.1;
  return lerpColor(URGENCY_COLORS.danger, URGENCY_COLORS.critical, t);
}

/**
 * Linear interpolation between two colors
 */
export function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Calculate feedback intensity based on reaction time
 * Faster reactions (lower ms) = higher intensity (closer to 1.0)
 * Slower reactions (higher ms) = lower intensity (closer to 0.3)
 * Perfect reactions (<150ms) = maximum intensity (1.0)
 */
export function calculateIntensity(reactionTime: number | null): number {
  if (!reactionTime || reactionTime <= 0) return 0.5; // Default for no reaction time
  
  // Perfect reaction (<150ms) = 1.0
  if (reactionTime < 150) return 1.0;
  
  // Excellent reaction (150-200ms) = 0.9-1.0
  if (reactionTime < 200) {
    return 0.9 + (0.1 * (1 - (reactionTime - 150) / 50));
  }
  
  // Good reaction (200-350ms) = 0.7-0.9
  if (reactionTime < 350) {
    return 0.7 + (0.2 * (1 - (reactionTime - 200) / 150));
  }
  
  // Slow reaction (350-500ms) = 0.5-0.7
  if (reactionTime < 500) {
    return 0.5 + (0.2 * (1 - (reactionTime - 350) / 150));
  }
  
  // Very slow reaction (>500ms) = 0.3-0.5
  return Math.max(0.3, 0.5 - ((reactionTime - 500) / 1000) * 0.2);
}

/**
 * Get color based on reaction time performance
 */
export function getColorByReactionTime(reactionTime: number | null): THREE.Color {
  if (!reactionTime || reactionTime <= 0) {
    return new THREE.Color(0.2, 1.0, 0.5); // Default green
  }
  
  if (reactionTime < 150) {
    // Perfect - bright cyan-green
    return new THREE.Color(0.0, 1.0, 0.8);
  } else if (reactionTime < 200) {
    // Excellent - bright green
    return new THREE.Color(0.2, 1.0, 0.5);
  } else if (reactionTime < 350) {
    // Good - yellow-green
    return new THREE.Color(0.6, 1.0, 0.3);
  } else if (reactionTime < 500) {
    // Slow - yellow
    return new THREE.Color(1.0, 0.8, 0.2);
  } else {
    // Very slow - orange
    return new THREE.Color(1.0, 0.5, 0.1);
  }
}

