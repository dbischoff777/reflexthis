/**
 * Debounce utility for performance optimization
 */

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
  
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        func(...args);
      };
  
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * React hook version of debounce
   */
  import { useRef, useCallback } from 'react';
  
  export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ): T {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
    return useCallback(
      ((...args: Parameters<T>) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
        }, delay);
      }) as T,
      [callback, delay]
    );
  }  