/**
 * Input buffering system for rapid key presses
 * Ensures no inputs are missed during high-frequency input scenarios
 */

export interface BufferedInput {
  buttonId: number;
  timestamp: number;
  type: 'keyboard' | 'mouse' | 'touch';
}

export class InputBuffer {
  private buffer: BufferedInput[] = [];
  private bufferSize: number;
  private maxProcessingAge: number;

  constructor(bufferSize: number = 5, maxProcessingAge: number = 100) {
    this.bufferSize = bufferSize;
    this.maxProcessingAge = maxProcessingAge;
  }

  /**
   * Add an input to the buffer with timestamp
   */
  addInput(buttonId: number, type: 'keyboard' | 'mouse' | 'touch' = 'keyboard'): void {
    const input: BufferedInput = {
      buttonId,
      timestamp: performance.now(),
      type,
    };

    this.buffer.push(input);

    // Keep buffer size limited
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Process buffer and return valid inputs
   * Removes inputs that are too old
   */
  processBuffer(currentTime?: number): BufferedInput[] {
    const now = currentTime ?? performance.now();
    
    // Filter valid inputs (not too old)
    const validInputs = this.buffer.filter(
      (input) => now - input.timestamp < this.maxProcessingAge
    );

    // Remove processed inputs from buffer
    this.buffer = this.buffer.filter(
      (input) => now - input.timestamp >= this.maxProcessingAge
    );

    return validInputs;
  }

  /**
   * Clear all buffered inputs
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get current buffer size
   */
  getSize(): number {
    return this.buffer.length;
  }

  /**
   * Get buffer statistics
   */
  getStats() {
    const now = performance.now();
    const validInputs = this.buffer.filter(
      (input) => now - input.timestamp < this.maxProcessingAge
    );

    return {
      totalBuffered: this.buffer.length,
      validInputs: validInputs.length,
      oldestInputAge: this.buffer.length > 0
        ? now - this.buffer[0].timestamp
        : 0,
      newestInputAge: this.buffer.length > 0
        ? now - this.buffer[this.buffer.length - 1].timestamp
        : 0,
    };
  }
}

/**
 * Input latency monitor for performance tracking
 */
export class InputLatencyMonitor {
  private inputTimestamps: Map<number, number> = new Map();
  private latencies: number[] = [];
  private maxSamples: number = 100;
  private onFeedbackCallback?: (buttonId: number) => void;

  /**
   * Record input timestamp
   */
  recordInput(buttonId: number): void {
    this.inputTimestamps.set(buttonId, performance.now());
  }

  /**
   * Record visual feedback timestamp and calculate latency
   */
  recordFeedback(buttonId: number): number | null {
    const inputTime = this.inputTimestamps.get(buttonId);
    if (!inputTime) return null;

    const feedbackTime = performance.now();
    const latency = feedbackTime - inputTime;

    // Store latency
    this.latencies.push(latency);
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }

    // Remove processed input
    this.inputTimestamps.delete(buttonId);

    return latency;
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  /**
   * Get minimum latency
   */
  getMinLatency(): number {
    if (this.latencies.length === 0) return 0;
    return Math.min(...this.latencies);
  }

  /**
   * Get maximum latency
   */
  getMaxLatency(): number {
    if (this.latencies.length === 0) return 0;
    return Math.max(...this.latencies);
  }

  /**
   * Get latency statistics
   */
  getStats() {
    if (this.latencies.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        samples: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      average: this.getAverageLatency(),
      min: this.getMinLatency(),
      max: this.getMaxLatency(),
      samples: this.latencies.length,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.inputTimestamps.clear();
    this.latencies = [];
  }

  /**
   * Set callback for when feedback is recorded
   */
  setOnFeedbackCallback(callback: (buttonId: number) => void): void {
    this.onFeedbackCallback = callback;
  }
}

