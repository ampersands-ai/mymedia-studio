import { toast } from 'sonner';
import { useRef, useCallback } from 'react';

interface RateLimitCountdown {
  seconds: number;
  displayText: string;
  resetAtTimestamp?: number;
}

interface RateLimitError {
  countdown?: RateLimitCountdown;
  retryAfter?: number;
  message?: string;
}

/**
 * Hook for showing rate limit toasts with countdown timers
 */
export function useRateLimitToast() {
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /**
   * Show a rate limit toast with countdown timer
   */
  const showRateLimitToast = useCallback((error: RateLimitError) => {
    // Clear any existing countdown
    clearCountdown();

    const retryAfterSeconds = error.countdown?.seconds || error.retryAfter || 60;
    const displayText = error.countdown?.displayText || `${retryAfterSeconds} seconds`;

    // Show initial error toast
    toastIdRef.current = toast.error('Rate limit exceeded', {
      description: `Please wait ${displayText} before trying again.`,
      duration: Infinity, // Keep until countdown completes
    });

    // Start countdown
    let remaining = retryAfterSeconds;
    
    countdownIntervalRef.current = setInterval(() => {
      remaining--;
      
      if (remaining <= 0) {
        clearCountdown();
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }
        toast.success('Ready to try again!', { 
          duration: 3000,
          description: 'The rate limit has expired. You can now retry your request.'
        });
        toastIdRef.current = null;
      } else {
        // Format remaining time
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        let timeText: string;
        
        if (minutes > 0 && seconds > 0) {
          timeText = `${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          timeText = `${minutes}m`;
        } else {
          timeText = `${seconds}s`;
        }

        // Update toast with countdown
        if (toastIdRef.current) {
          toast.loading(`Rate limited - wait ${timeText}`, {
            id: toastIdRef.current,
            description: 'Request limit reached. Please wait before retrying.',
          });
        }
      }
    }, 1000);

    // Return cleanup function
    return clearCountdown;
  }, [clearCountdown]);

  /**
   * Check if an error is a rate limit error and show toast if so
   * Returns true if it was a rate limit error
   */
  const handlePossibleRateLimitError = useCallback((error: unknown): boolean => {
    // Check if it's a rate limit error
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Check for rate limit indicators
      if (message.includes('rate limit') || message.includes('too many requests')) {
        // Try to extract countdown info from the error
        try {
          // Some errors might have structured data
          const parsed = JSON.parse(error.message);
          if (parsed.countdown || parsed.retryAfter) {
            showRateLimitToast(parsed);
            return true;
          }
        } catch {
          // Not JSON, show generic rate limit toast
          showRateLimitToast({ retryAfter: 60, message: error.message });
          return true;
        }
      }
    }
    
    return false;
  }, [showRateLimitToast]);

  return {
    showRateLimitToast,
    handlePossibleRateLimitError,
    clearCountdown,
  };
}

/**
 * Standalone function to show a rate limit toast
 * Use when you don't need the hook's lifecycle management
 */
export function showRateLimitError(retryAfterSeconds: number = 60): () => void {
  const minutes = Math.floor(retryAfterSeconds / 60);
  const seconds = retryAfterSeconds % 60;
  
  let displayText: string;
  if (minutes > 0 && seconds > 0) {
    displayText = `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    displayText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    displayText = `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const toastId = toast.error('Rate limit exceeded', {
    description: `Please wait ${displayText} before trying again.`,
    duration: retryAfterSeconds * 1000,
  });

  let remaining = retryAfterSeconds;
  const interval = setInterval(() => {
    remaining--;
    
    if (remaining <= 0) {
      clearInterval(interval);
      toast.dismiss(toastId);
      toast.success('Ready to try again!', { duration: 3000 });
    } else {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const timeText = m > 0 ? `${m}m ${s}s` : `${s}s`;
      
      toast.loading(`Rate limited - wait ${timeText}`, { id: toastId });
    }
  }, 1000);

  return () => clearInterval(interval);
}

/**
 * Check if a response/error indicates rate limiting
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || message.includes('too many requests') || message.includes('429');
  }
  return false;
}

/**
 * Extract retry-after seconds from a rate limit error
 */
export function extractRetryAfter(error: unknown): number | null {
  if (error instanceof Error) {
    try {
      // Try parsing as JSON
      const parsed = JSON.parse(error.message);
      return parsed.retryAfter || parsed.countdown?.seconds || null;
    } catch {
      // Try extracting from message
      const match = error.message.match(/(\d+)\s*(?:seconds?|s)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }
  return null;
}
