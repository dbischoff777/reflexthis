/**
 * Haptic feedback utility for mobile devices
 * Provides vibration feedback for button presses and game events
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

interface HapticPattern {
  pattern: number[];
  repeat?: number;
}

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
  light: { pattern: [10] },
  medium: { pattern: [20] },
  heavy: { pattern: [30] },
  success: { pattern: [10, 50, 10] },
  error: { pattern: [20, 50, 20, 50, 20] },
  warning: { pattern: [15, 30, 15] },
};

/**
 * Trigger haptic feedback if available
 * @param type - Type of haptic feedback to trigger
 */
export function triggerHaptic(type: HapticType = 'medium'): void {
  // Check if Vibration API is available (mobile browsers)
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    const pattern = HAPTIC_PATTERNS[type];
    if (pattern.repeat !== undefined) {
      navigator.vibrate(pattern.pattern);
    } else {
      navigator.vibrate(pattern.pattern);
    }
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Check if haptic feedback is available
 */
export function isHapticAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
}

