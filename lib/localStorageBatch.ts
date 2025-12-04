/**
 * Batched localStorage operations to prevent blocking the main thread
 */

type StorageOperation = () => void;

class LocalStorageBatcher {
  private queue: StorageOperation[] = [];
  private flushScheduled = false;
  private readonly BATCH_DELAY = 100; // ms

  private scheduleFlush() {
    if (this.flushScheduled) return;
    
    this.flushScheduled = true;
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.flush();
      }, { timeout: this.BATCH_DELAY });
    } else {
      setTimeout(() => {
        this.flush();
      }, this.BATCH_DELAY);
    }
  }

  private flush() {
    const operations = [...this.queue];
    this.queue = [];
    this.flushScheduled = false;
    
    operations.forEach(op => {
      try {
        op();
      } catch (error) {
        console.error('LocalStorage operation failed:', error);
      }
    });
  }

  enqueue(operation: StorageOperation) {
    this.queue.push(operation);
    this.scheduleFlush();
  }

  setItem(key: string, value: string) {
    this.enqueue(() => {
      localStorage.setItem(key, value);
    });
  }

  getItem(key: string): string | null {
    // Synchronous read for immediate needs
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  removeItem(key: string) {
    this.enqueue(() => {
      localStorage.removeItem(key);
    });
  }
}

export const localStorageBatcher = new LocalStorageBatcher();

