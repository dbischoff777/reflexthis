/**
 * Adaptive Difficulty System
 * Adjusts game difficulty based on player performance metrics
 */

import { DifficultyPreset, DIFFICULTY_PRESETS } from './difficulty';

export interface PlayerAction {
  timestamp: number;
  reactionTime: number | null;
  isCorrect: boolean;
  isMiss: boolean;
}

export interface PerformanceMetrics {
  accuracy: number; // 0-1
  avgReactionTime: number;
  baselineReactionTime: number;
  currentMissStreak: number;
  totalActions: number;
}

export interface AdaptiveDifficultyConfig {
  enabled: boolean;
  sensitivityFactor: number; // 0-1, how aggressively to adjust
  maxDifficultyChange: number; // Max change per update (0-1)
  decayRate: number; // Rate at which difficulty returns to baseline
  samplingInterval: number; // ms between updates
  performanceWindowSize: number; // Number of actions to track
  minActionsBeforeAdjustment: number; // Minimum actions before first adjustment
  targetAccuracy: number; // Target accuracy (0-1)
  difficultyFloor: number; // Minimum difficulty multiplier (0-1)
  difficultyCeiling: number; // Maximum difficulty multiplier (0-1)
}

export interface DifficultyChangeLog {
  timestamp: number;
  difficultyLevel: number;
  metrics: PerformanceMetrics;
  adjustment: number;
}

const DEFAULT_CONFIG: AdaptiveDifficultyConfig = {
  enabled: true, // Enabled by default
  sensitivityFactor: 0.1, // Increased sensitivity for more noticeable adjustments
  maxDifficultyChange: 0.15, // Increased max change
  decayRate: 0.005, // Slower decay to maintain adjustments longer
  samplingInterval: 3000,
  performanceWindowSize: 15, // Smaller window for faster response
  minActionsBeforeAdjustment: 3, // Lower threshold to start adjusting sooner
  targetAccuracy: 0.75,
  difficultyFloor: 0.3,
  difficultyCeiling: 1.5, // Will be refined per preset in constructor
};

export class AdaptiveDifficulty {
  private difficultyLevel: number = 1.0; // Multiplier (1.0 = baseline)
  private performanceWindow: PlayerAction[] = [];
  private config: AdaptiveDifficultyConfig;
  private baselinePreset: DifficultyPreset;
  private updateInterval: NodeJS.Timeout | null = null;
  private changeLog: DifficultyChangeLog[] = [];
  private currentMissStreak: number = 0;
  private baselineReactionTime: number | null = null;

  constructor(preset: DifficultyPreset, config?: Partial<AdaptiveDifficultyConfig>) {
    this.baselinePreset = preset;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.difficultyLevel = 1.0;
    
    // Adjust target accuracy based on base difficulty preset
    // Easier modes should have lower target accuracy expectations
    const presetTargetAccuracy: Record<DifficultyPreset, number> = {
      easy: 0.55,    // Lower expectation for easy mode
      medium: 0.65,  // Standard expectation
      hard: 0.70,    // Higher expectation for hard mode
      nightmare: 0.75, // Very high expectation for nightmare
    };
    this.config.targetAccuracy = presetTargetAccuracy[preset];
    
    // Adjust sensitivity based on difficulty - easier modes need more aggressive adjustments
    const presetSensitivity: Record<DifficultyPreset, number> = {
      easy: 0.14,    // More sensitive on easy (players struggling more)
      medium: 0.12,  // Standard sensitivity
      hard: 0.10,    // Less sensitive on hard (smaller adjustments)
      nightmare: 0.06, // Least sensitive on nightmare
    };
    this.config.sensitivityFactor = presetSensitivity[preset];

    // Set preset-specific adaptive difficulty ceilings to keep scaling fair
    // Easy: small headroom, Medium: moderate, Hard: full, Nightmare: slightly reduced
    const presetCeiling: Record<DifficultyPreset, number> = {
      easy: 1.1,       // Up to ~10% harder than easy baseline
      medium: 1.2,     // Up to ~20% harder than medium baseline
      hard: 1.3,       // Allow full global headroom on hard
      nightmare: 1.4,  // Slightly capped to avoid over-punishing on an already brutal base
    };
    this.config.difficultyCeiling = presetCeiling[preset];
  }

  /**
   * Start adaptive difficulty system
   */
  public start(): void {
    if (!this.config.enabled || this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.updateDifficulty();
    }, this.config.samplingInterval);
  }

  /**
   * Stop adaptive difficulty system
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Record a player action
   */
  public recordAction(action: PlayerAction): void {
    if (!this.config.enabled) return;

    this.performanceWindow.push(action);
    if (this.performanceWindow.length > this.config.performanceWindowSize) {
      this.performanceWindow.shift();
    }

    // Update miss streak
    if (action.isMiss) {
      this.currentMissStreak++;
      // Reset difficulty multiplier BELOW baseline on error to actually slow down the game
      // Set to 0.7 (30% easier) to counteract score-based progression
      // This provides immediate relief when player makes a mistake
      this.difficultyLevel = 0.7;
      
      // Log the reset
      if (this.performanceWindow.length > 0) {
        const metrics = this.calculatePerformanceMetrics();
        const adjustment = 0.7 - (this.difficultyLevel > 0.7 ? this.difficultyLevel : 1.0);
        this.logDifficultyChange(this.difficultyLevel, metrics, adjustment);
      }
    } else {
      this.currentMissStreak = 0;
    }

    // Set baseline reaction time from first few correct actions
    if (action.isCorrect && action.reactionTime !== null && this.baselineReactionTime === null) {
      this.baselineReactionTime = action.reactionTime;
    } else if (action.isCorrect && action.reactionTime !== null && this.baselineReactionTime !== null) {
      // Smooth baseline update
      this.baselineReactionTime = this.baselineReactionTime * 0.9 + action.reactionTime * 0.1;
    }
  }

  /**
   * Get current difficulty multiplier
   */
  public getDifficultyMultiplier(): number {
    return this.difficultyLevel;
  }

  /**
   * Get difficulty change log
   */
  public getChangeLog(): DifficultyChangeLog[] {
    return [...this.changeLog];
  }

  /**
   * Reset adaptive difficulty system
   */
  public reset(): void {
    this.difficultyLevel = 1.0;
    this.performanceWindow = [];
    this.currentMissStreak = 0;
    this.baselineReactionTime = null;
    this.changeLog = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AdaptiveDifficultyConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled && !wasEnabled) {
      this.start();
    } else if (!this.config.enabled && wasEnabled) {
      this.stop();
    }
  }

  /**
   * Calculate performance metrics from action window
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    // Get expected baseline reaction time based on difficulty preset
    const presetBaselineReactionTime: Record<DifficultyPreset, number> = {
      easy: 800,     // Slower expected reaction time for easy
      medium: 500,   // Standard expected reaction time
      hard: 350,     // Faster expected reaction time for hard
      nightmare: 250, // Very fast expected reaction time for nightmare
    };
    const expectedBaseline = presetBaselineReactionTime[this.baselinePreset];
    
    if (this.performanceWindow.length === 0) {
      return {
        accuracy: 0.5,
        avgReactionTime: 0,
        baselineReactionTime: this.baselineReactionTime || expectedBaseline,
        currentMissStreak: this.currentMissStreak,
        totalActions: 0,
      };
    }

    const correctActions = this.performanceWindow.filter(a => a.isCorrect);
    const accuracy = correctActions.length / this.performanceWindow.length;

    const reactionTimes = correctActions
      .map(a => a.reactionTime)
      .filter((rt): rt is number => rt !== null);
    
    const avgReactionTime = reactionTimes.length > 0
      ? reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length
      : 0;

    // Use actual baseline if set, otherwise use expected baseline for the preset
    const baseline = this.baselineReactionTime || (avgReactionTime > 0 ? avgReactionTime : expectedBaseline);

    return {
      accuracy,
      avgReactionTime,
      baselineReactionTime: baseline,
      currentMissStreak: this.currentMissStreak,
      totalActions: this.performanceWindow.length,
    };
  }

  /**
   * Update difficulty based on performance
   */
  private updateDifficulty(): void {
    if (this.performanceWindow.length < this.config.minActionsBeforeAdjustment) {
      return;
    }

    const metrics = this.calculatePerformanceMetrics();
    let adjustment = 0;

    // Adjust based on accuracy (more aggressive for low accuracy)
    const accuracyDiff = metrics.accuracy - this.config.targetAccuracy;
    // Use exponential scaling for low accuracy to make it more responsive
    if (accuracyDiff < 0) {
      // Low accuracy - reduce difficulty more aggressively
      adjustment += accuracyDiff * this.config.sensitivityFactor * 4;
    } else {
      // High accuracy - increase difficulty gradually
      adjustment += accuracyDiff * this.config.sensitivityFactor * 2;
    }

    // Adjust based on reaction time (faster = increase difficulty)
    if (metrics.baselineReactionTime > 0 && metrics.avgReactionTime > 0) {
      const reactionTimeRatio = (metrics.baselineReactionTime - metrics.avgReactionTime) / metrics.baselineReactionTime;
      adjustment += reactionTimeRatio * this.config.sensitivityFactor;
    }

    // Adjust based on miss streaks (reduce difficulty on long streaks - more aggressive)
    if (metrics.currentMissStreak >= 2) {
      // Start reducing difficulty after just 2 misses
      adjustment -= 0.08 * (metrics.currentMissStreak - 1);
    }
    
    // Additional penalty for very low accuracy in recent window
    if (metrics.accuracy < 0.5 && metrics.totalActions >= 5) {
      adjustment -= 0.1; // Significant reduction for poor performance
    }

    // Apply guardrails
    adjustment = Math.max(
      -this.config.maxDifficultyChange,
      Math.min(adjustment, this.config.maxDifficultyChange)
    );

    // Apply decay (gradually return to baseline)
    const decayAdjustment = (1.0 - this.difficultyLevel) * this.config.decayRate;
    this.difficultyLevel += adjustment + decayAdjustment;

    // Clamp to floor/ceiling
    this.difficultyLevel = Math.max(
      this.config.difficultyFloor,
      Math.min(this.difficultyLevel, this.config.difficultyCeiling)
    );

    // Log state change
    this.logDifficultyChange(this.difficultyLevel, metrics, adjustment);
  }

  /**
   * Log difficulty change
   */
  private logDifficultyChange(
    difficultyLevel: number,
    metrics: PerformanceMetrics,
    adjustment: number
  ): void {
    this.changeLog.push({
      timestamp: Date.now(),
      difficultyLevel,
      metrics,
      adjustment,
    });

    // Keep only last 100 entries
    if (this.changeLog.length > 100) {
      this.changeLog.shift();
    }
  }

  /**
   * Get adjusted highlight duration
   */
  public getAdjustedHighlightDuration(baseDuration: number): number {
    if (!this.config.enabled) return baseDuration;
    // Higher difficulty = shorter duration
    return baseDuration / this.difficultyLevel;
  }

  /**
   * Get adjusted max buttons
   */
  public getAdjustedMaxButtons(baseMaxButtons: number): number {
    if (!this.config.enabled) return baseMaxButtons;
    // Higher difficulty = more buttons
    return Math.min(10, Math.ceil(baseMaxButtons * this.difficultyLevel));
  }

  /**
   * Get adjusted speed increase
   */
  public getAdjustedSpeedIncrease(baseSpeedIncrease: number): number {
    if (!this.config.enabled) return baseSpeedIncrease;
    // Higher difficulty = faster speed increase
    return baseSpeedIncrease * this.difficultyLevel;
  }
}

