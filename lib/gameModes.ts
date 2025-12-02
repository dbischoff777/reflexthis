/**
 * Game mode definitions for ReflexThis
 */

export type GameMode = 'reflex' | 'sequence' | 'survival' | 'nightmare' | 'oddOneOut';

export interface GameModeInfo {
  id: GameMode;
  name: string;
  description: string;
  icon: string;
}

export const GAME_MODES: Record<GameMode, GameModeInfo> = {
  reflex: {
    id: 'reflex',
    name: 'Reflex',
    description: 'Press highlighted buttons as fast as possible before they disappear.',
    icon: '⚡',
  },
  oddOneOut: {
    id: 'oddOneOut',
    name: 'Odd One Out',
    description: 'Multiple buttons light up – only one is correct. Hit the odd one out fast!',
    icon: '🎯',
  },
  sequence: {
    id: 'sequence',
    name: 'Sequence',
    description: 'Remember and repeat the exact sequence of buttons shown.',
    icon: '🧠',
  },
  survival: {
    id: 'survival',
    name: 'Survival',
    description: 'One mistake and it\'s game over! How long can you survive?',
    icon: '💀',
  },
  nightmare: {
    id: 'nightmare',
    name: 'Nightmare',
    description: 'Brutal challenge for the top 0.1% of players. Extreme speed and difficulty.',
    icon: '🔥',
  },
};

