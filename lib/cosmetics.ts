/**
 * Cosmetic system for ReflexThis
 * Handles cosmetic items (themes, particle trails, hit sounds) and selection
 */

export type CosmeticCategory = 'theme' | 'particleTrail' | 'hitSound';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  unlockLevel?: number; // Level required to unlock (if any)
  ticketCost?: number; // Tickets required to purchase (if not level-locked)
  colors?: {
    accent: string; // Hex color
    accent2: string; // Hex color
    primary?: string; // Hex color
    secondary?: string; // Hex color
  };
  soundId?: string; // For hit sounds
  particleType?: 'sparkle' | 'burst' | 'trail' | 'ring'; // For particle trails
}

/**
 * All available cosmetic items
 */
export const COSMETICS: CosmeticItem[] = [
  // Default theme (always unlocked)
  {
    id: 'theme-default',
    name: 'Default',
    description: 'The classic cyan and magenta theme',
    category: 'theme',
    rarity: 'common',
    colors: {
      accent: '#00ffff',
      accent2: '#ff00ff',
      primary: '#00ffff',
      secondary: '#ff00ff',
    },
  },
  // Level-locked themes
  {
    id: 'theme-blue',
    name: 'Ocean Blue',
    description: 'A calming blue ocean theme',
    category: 'theme',
    rarity: 'rare',
    unlockLevel: 10,
    colors: {
      accent: '#0099ff',
      accent2: '#0066cc',
      primary: '#0099ff',
      secondary: '#0066cc',
    },
  },
  {
    id: 'theme-purple',
    name: 'Purple Haze',
    description: 'A vibrant purple theme',
    category: 'theme',
    rarity: 'epic',
    unlockLevel: 25,
    colors: {
      accent: '#9966ff',
      accent2: '#6600cc',
      primary: '#9966ff',
      secondary: '#6600cc',
    },
  },
  {
    id: 'theme-gold',
    name: 'Golden',
    description: 'A luxurious gold theme',
    category: 'theme',
    rarity: 'epic',
    unlockLevel: 50,
    colors: {
      accent: '#ffcc00',
      accent2: '#ff9900',
      primary: '#ffcc00',
      secondary: '#ff9900',
    },
  },
  {
    id: 'theme-legendary',
    name: 'Legendary',
    description: 'The ultimate legendary theme',
    category: 'theme',
    rarity: 'legendary',
    unlockLevel: 100,
    colors: {
      accent: '#ff00ff',
      accent2: '#00ffff',
      primary: '#ff00ff',
      secondary: '#00ffff',
    },
  },
  // Ticket-purchasable themes
  {
    id: 'theme-green',
    name: 'Neon Green',
    description: 'A vibrant neon green theme',
    category: 'theme',
    rarity: 'rare',
    ticketCost: 5,
    colors: {
      accent: '#00ff00',
      accent2: '#00cc00',
      primary: '#00ff00',
      secondary: '#00cc00',
    },
  },
  {
    id: 'theme-red',
    name: 'Crimson',
    description: 'A bold red theme',
    category: 'theme',
    rarity: 'rare',
    ticketCost: 5,
    colors: {
      accent: '#ff0000',
      accent2: '#cc0000',
      primary: '#ff0000',
      secondary: '#cc0000',
    },
  },
  // Particle trails
  {
    id: 'trail-sparkle',
    name: 'Sparkle Trail',
    description: 'Sparkling particle trail effect',
    category: 'particleTrail',
    rarity: 'epic',
    unlockLevel: 75,
    particleType: 'sparkle',
  },
  {
    id: 'trail-burst',
    name: 'Burst Trail',
    description: 'Explosive burst particle effect',
    category: 'particleTrail',
    rarity: 'rare',
    ticketCost: 10,
    particleType: 'burst',
  },
  {
    id: 'trail-ring',
    name: 'Ring Trail',
    description: 'Expanding ring particle effect',
    category: 'particleTrail',
    rarity: 'common',
    ticketCost: 3,
    particleType: 'ring',
  },
  // Hit sounds (placeholder - would need actual sound files)
  {
    id: 'sound-default',
    name: 'Default',
    description: 'The classic hit sound',
    category: 'hitSound',
    rarity: 'common',
    soundId: 'hit',
  },
  {
    id: 'sound-chime',
    name: 'Chime',
    description: 'A pleasant chime sound',
    category: 'hitSound',
    rarity: 'rare',
    ticketCost: 5,
    soundId: 'hit-chime',
  },
  {
    id: 'sound-pop',
    name: 'Pop',
    description: 'A satisfying pop sound',
    category: 'hitSound',
    rarity: 'common',
    ticketCost: 3,
    soundId: 'hit-pop',
  },
];

const STORAGE_KEY = 'reflexthis_activeCosmetics';

export interface ActiveCosmetics {
  theme?: string;
  particleTrail?: string;
  hitSound?: string;
}

/**
 * Get all cosmetics
 */
export function getAllCosmetics(): CosmeticItem[] {
  return COSMETICS;
}

/**
 * Get cosmetics by category
 */
export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETICS.filter(cosmetic => cosmetic.category === category);
}

/**
 * Get a cosmetic by ID
 */
export function getCosmeticById(id: string): CosmeticItem | undefined {
  return COSMETICS.find(cosmetic => cosmetic.id === id);
}

/**
 * Check if a cosmetic is unlocked for the user
 */
export function isCosmeticUnlocked(cosmeticId: string, userLevel: number, unlockedCosmetics: string[]): boolean {
  const cosmetic = getCosmeticById(cosmeticId);
  if (!cosmetic) return false;

  // Default theme is always unlocked
  if (cosmeticId === 'theme-default') return true;

  // Check if explicitly unlocked (from level-up rewards or purchase)
  if (unlockedCosmetics.includes(cosmeticId)) return true;

  // Check if level-locked and user has reached required level
  if (cosmetic.unlockLevel && userLevel >= cosmetic.unlockLevel) return true;

  return false;
}

/**
 * Check if a cosmetic can be purchased with tickets
 */
export function canPurchaseWithTickets(cosmeticId: string, userTickets: number, userLevel: number, unlockedCosmetics: string[]): boolean {
  const cosmetic = getCosmeticById(cosmeticId);
  if (!cosmetic) return false;

  // Already unlocked
  if (isCosmeticUnlocked(cosmeticId, userLevel, unlockedCosmetics)) return false;

  // Must have ticket cost
  if (!cosmetic.ticketCost) return false;

  // Must have enough tickets
  return userTickets >= cosmetic.ticketCost;
}

/**
 * Load active cosmetics from localStorage
 */
export function loadActiveCosmetics(): ActiveCosmetics {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const activeJson = localStorage.getItem(STORAGE_KEY);
    if (!activeJson) {
      return {
        theme: 'theme-default',
        hitSound: 'sound-default',
      };
    }

    return JSON.parse(activeJson) as ActiveCosmetics;
  } catch (error) {
    console.error('Error loading active cosmetics:', error);
    return {
      theme: 'theme-default',
      hitSound: 'sound-default',
    };
  }
}

/**
 * Save active cosmetics to localStorage
 */
export function saveActiveCosmetics(active: ActiveCosmetics): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  } catch (error) {
    console.error('Error saving active cosmetics:', error);
  }
}

/**
 * Set active cosmetic for a category
 */
export function setActiveCosmetic(category: CosmeticCategory, cosmeticId: string): void {
  const active = loadActiveCosmetics();
  active[category] = cosmeticId;
  saveActiveCosmetics(active);
}

/**
 * Get active cosmetic for a category
 */
export function getActiveCosmetic(category: CosmeticCategory): string | undefined {
  const active = loadActiveCosmetics();
  return active[category];
}

/**
 * Get cosmetic colors for active theme
 */
export function getActiveThemeColors(): { accent: string; accent2: string; primary?: string; secondary?: string } | null {
  const activeThemeId = getActiveCosmetic('theme') || 'theme-default';
  const theme = getCosmeticById(activeThemeId);
  return theme?.colors || null;
}

