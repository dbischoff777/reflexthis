import * as THREE from 'three';

// Ripple event for cross-button communication
export interface RippleEvent {
  sourceIndex: number;
  timestamp: number;
  type: 'success' | 'error';
  intensity?: number; // Reaction time-based intensity (0-1)
}

export interface GameButton3DWebGLProps {
  index: number;
  highlighted: boolean;
  isOddTarget?: boolean;
  isBonus?: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
  pressFeedback?: 'success' | 'error' | null;
  onPress: (index: number) => void;
  disabled?: boolean;
  baseColor?: string;
  highlightColor?: string;
  size?: number;
  className?: string;
}

export interface GameState {
  combo: number;
  lives: number;
  maxLives: number;
  gameOver: boolean;
  score: number;
  difficulty: string; // DifficultyPreset from game context
  reducedEffects?: boolean;
  gameMode?: string;
}

export interface GameButtonGridWebGLProps {
  buttons: Array<{
    index: number;
    highlighted: boolean;
    isBonus?: boolean;
    highlightStartTime?: number;
    pressFeedback?: 'success' | 'error' | null;
    reactionTime?: number | null;
    isOddTarget?: boolean;
  }>;
  highlightDuration: number;
  onPress: (index: number) => void;
  disabled?: boolean;
  keyLabels?: Record<number, string>; // Keyboard key labels for each button (1-10)
  showLabels?: boolean; // Whether to show labels on buttons (default: true)
  gameState?: GameState;
  comboMilestone?: number | null;
  performance?: {
    maxDpr?: number;
    renderScale?: number;
    gridScale?: number;
    disablePostprocessing?: boolean;
    powerPreference?: WebGLPowerPreference;
  };
}

export interface ButtonMeshProps {
  buttonIndex: number;
  highlighted: boolean;
  isOddTarget?: boolean;
  isBonus?: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
  pressFeedback?: 'success' | 'error' | null;
  reactionTime?: number | null;
  gameMode?: string;
  onPress: () => void;
  disabled?: boolean;
  position: [number, number, number];
  rippleEvents?: RippleEvent[];
  allButtonPositions?: Array<{ index: number; position: [number, number, number] }>;
  keyLabel?: string; // Keyboard key to display on button
  showLabel?: boolean; // Whether to show label
  highlightedButtons?: number[]; // All currently highlighted button indices for arc effects
  reducedEffects?: boolean;
}

export interface BackgroundGridProps {
  gameState?: GameState;
  highlightedCount?: number;
  comboMilestone?: number | null;
}

export interface DynamicBloomProps {
  comboMilestone?: number | null;
  baseIntensity?: number;
}

export interface CameraShakeProps {
  errorEvents: RippleEvent[];
  comboMilestone?: number | null;
}

export interface ParticleBurstProps {
  trigger: 'success' | 'error' | null;
  position: [number, number, number];
  reactionTime?: number | null;
  intensity?: number;
  reducedEffects?: boolean;
}

export interface PressDepthIndicatorProps {
  active: boolean;
  depth: number; // 0-1, where 1 = maximum depth
  position: [number, number, number];
}

export interface GlowTrailProps {
  active: boolean;
  intensity: number;
  position: [number, number, number];
}

export interface CountdownRingProps {
  active: boolean;
  highlightStartTime?: number;
  highlightDuration: number;
}

export interface ShockwaveProps {
  trigger: 'success' | 'error' | null;
  position: [number, number, number];
}

export interface EnergyCoreProps {
  active: boolean;
  progress: number;
  color: THREE.Color;
}

export interface FloatingParticlesProps {
  active: boolean;
  color: THREE.Color;
  position: [number, number, number];
}

export interface ElectricArcProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  active: boolean;
  color: THREE.Color;
}

