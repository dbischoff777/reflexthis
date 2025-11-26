/**
 * Keybindings management for game buttons
 * Supports customizable keyboard layouts for 3x3 button grid
 */

export interface Keybindings {
  // Button IDs 1-10 mapped to keyboard keys
  [buttonId: number]: string;
}

// Default keybindings - QWERTZ layout matching 3-4-3 grid
// Row 1 (top): q, w, e
// Row 2 (middle): a, s, d, f
// Row 3 (bottom): y, x, c
export const DEFAULT_KEYBINDINGS: Keybindings = {
  1: 'q',
  2: 'w',
  3: 'e',
  4: 'a',
  5: 's',
  6: 'd',
  7: 'f',
  8: 'y',
  9: 'x',
  10: 'c',
};

// Numpad-friendly preset
// Mapped to typical numpad shape:
// Row 1 (top): 7, 8, 9
// Row 2 (middle): 4, 5, 6, +
// Row 3 (bottom): 1, 2, 3
export const NUMPAD_KEYBINDINGS: Keybindings = {
  1: '7',
  2: '8',
  3: '9',
  4: '4',
  5: '5',
  6: '6',
  7: '+',
  8: '1',
  9: '2',
  10: '3',
};

const STORAGE_KEY = 'reflexthis_keybindings';

/**
 * Get current keybindings from localStorage or return defaults
 */
export function getKeybindings(): Keybindings {
  if (typeof window === 'undefined') {
    return DEFAULT_KEYBINDINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that all buttons have keys
      const valid: Keybindings = {};
      for (let i = 1; i <= 10; i++) {
        valid[i] = parsed[i] || DEFAULT_KEYBINDINGS[i];
      }
      return valid;
    }
  } catch (error) {
    console.error('Error loading keybindings:', error);
  }

  return DEFAULT_KEYBINDINGS;
}

/**
 * Save keybindings to localStorage
 */
export function saveKeybindings(keybindings: Keybindings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keybindings));
  } catch (error) {
    console.error('Error saving keybindings:', error);
  }
}

/**
 * Reset keybindings to defaults
 */
export function resetKeybindings(): Keybindings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_KEYBINDINGS;
}

/**
 * Get the button ID for a given key
 */
export function getButtonIdForKey(key: string, keybindings: Keybindings): number | null {
  const normalizedKey = key.toLowerCase();
  for (const [buttonId, binding] of Object.entries(keybindings)) {
    if (binding.toLowerCase() === normalizedKey) {
      return parseInt(buttonId, 10);
    }
  }
  return null;
}

/**
 * Check if a key is already bound to another button
 */
export function isKeyBound(key: string, excludeButtonId: number, keybindings: Keybindings): boolean {
  const normalizedKey = key.toLowerCase();
  for (const [buttonId, binding] of Object.entries(keybindings)) {
    const id = parseInt(buttonId, 10);
    if (id !== excludeButtonId && binding.toLowerCase() === normalizedKey) {
      return true;
    }
  }
  return false;
}

/**
 * Get a human-readable key name (handles special keys)
 */
export function getKeyDisplayName(key: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': 'Enter',
    'Shift': 'Shift',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': 'Meta',
    'Tab': 'Tab',
    'Escape': 'Esc',
    'Backspace': 'Backspace',
    'Delete': 'Del',
  };

  return keyMap[key] || key.toUpperCase();
}

