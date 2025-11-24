/**
 * useInterval Hook
 *
 * Safe interval hook with automatic cleanup.
 * Prevents memory leaks from uncanceled intervals.
 *
 * Benefits:
 * - Automatic cleanup on unmount
 * - Handles dynamic delay changes
 * - Can pause/resume with null delay
 * - TypeScript safe
 *
 * Usage:
 * ```tsx
 * const [count, setCount] = useState(0);
 *
 * // Update every second
 * useInterval(() => {
 *   setCount(count + 1);
 * }, 1000);
 *
 * // Pause by passing null
 * useInterval(() => {
 *   console.log('This will not run');
 * }, isPaused ? null : 1000);
 * ```
 */

import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if no delay is specified or delay is null (paused)
    if (delay === null) {
      return;
    }

    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    // Clear any existing interval before setting new one
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    intervalIdRef.current = setInterval(tick, delay);

    // Cleanup function - CRITICAL for preventing memory leaks
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [delay]);
}

/**
 * useTimeout Hook
 *
 * Safe timeout hook with automatic cleanup.
 * Similar to useInterval but runs only once.
 *
 * Usage:
 * ```tsx
 * useTimeout(() => {
 *   console.log('This runs after 5 seconds');
 * }, 5000);
 * ```
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout
  useEffect(() => {
    // Don't schedule if no delay is specified or delay is null (paused)
    if (delay === null) {
      return;
    }

    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    // Clear any existing timeout before setting new one
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    timeoutIdRef.current = setTimeout(tick, delay);

    // Cleanup function - CRITICAL for preventing memory leaks
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [delay]);
}

/**
 * useDebounce Hook
 *
 * Debounces a value - delays updating the value until after a specified delay.
 * Useful for search inputs, window resize handlers, etc.
 *
 * Usage:
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This only runs 500ms after user stops typing
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout on value change or unmount
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Fix import for useDebounce
import * as React from 'react';
