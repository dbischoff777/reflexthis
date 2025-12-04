import { useRef, useCallback, useEffect } from 'react';

/**
 * Centralized timer management hook
 * Prevents memory leaks and provides better timer management
 */
export function useTimer() {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  const setTimer = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      callback();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);
  
  const clearTimer = useCallback((id: NodeJS.Timeout | null | undefined) => {
    if (id) {
      clearTimeout(id);
      timersRef.current.delete(id);
    }
  }, []);
  
  const clearAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);
  
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);
  
  return { setTimer, clearTimer, clearAll };
}

