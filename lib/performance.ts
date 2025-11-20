/**
 * Performance monitoring utilities
 * Helps track and log performance metrics during development and production
 */

/**
 * Log performance metrics for a given operation
 * @param label - Label for the performance measurement
 * @returns Function to call when operation completes
 */
export function logPerformance(label: string): () => void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return () => {}; // No-op on server or if performance API unavailable
  }

  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }

    // In production, you could send metrics to analytics service
    // e.g., Google Analytics, custom analytics endpoint, etc.
  };
}

/**
 * Measure and log performance with custom callback
 * @param label - Label for the performance measurement
 * @param callback - Function to execute and measure
 * @returns Result of the callback
 */
export async function measurePerformance<T>(
  label: string,
  callback: () => T | Promise<T>
): Promise<T> {
  const endMeasurement = logPerformance(label);
  try {
    const result = await callback();
    endMeasurement();
    return result;
  } catch (error) {
    endMeasurement();
    throw error;
  }
}

/**
 * Track frame rate (FPS) for performance monitoring
 * Useful for ensuring smooth 60fps gameplay
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;
  private rafId: number | null = null;

  start() {
    if (this.isMonitoring || typeof window === 'undefined') return;

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frames = [];

    const measure = () => {
      if (!this.isMonitoring) return;

      this.frameCount++;
      const currentTime = performance.now();
      const delta = currentTime - this.lastTime;

      if (delta >= 1000) {
        // Calculate FPS every second
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.frames.push(fps);

        // Keep only last 60 measurements
        if (this.frames.length > 60) {
          this.frames.shift();
        }

        // Log if FPS drops below 55 (indicating performance issues)
        if (process.env.NODE_ENV === 'development' && fps < 55) {
          console.warn(`[Performance] Low FPS detected: ${fps}fps`);
        }

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  stop() {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  getMinFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.min(...this.frames);
  }

  getMaxFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.max(...this.frames);
  }
}

