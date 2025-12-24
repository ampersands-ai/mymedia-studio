import { useState, useEffect, useCallback, useRef } from 'react';

const COOLDOWN_DURATION_MS = 12000; // 12 seconds
const COOLDOWN_STORAGE_KEY = 'last_generation_timestamp';

interface CooldownState {
  isOnCooldown: boolean;
  remainingSeconds: number;
  lastGenerationTime: number | null;
}

/**
 * Hook to manage generation cooldown (12 seconds between generations)
 * Persists across page refreshes using localStorage
 */
export const useGenerationCooldown = () => {
  const [state, setState] = useState<CooldownState>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    const lastTime = stored ? parseInt(stored, 10) : null;
    
    if (lastTime) {
      const elapsed = Date.now() - lastTime;
      const remaining = Math.max(0, COOLDOWN_DURATION_MS - elapsed);
      return {
        isOnCooldown: remaining > 0,
        remainingSeconds: Math.ceil(remaining / 1000),
        lastGenerationTime: lastTime,
      };
    }
    
    return {
      isOnCooldown: false,
      remainingSeconds: 0,
      lastGenerationTime: null,
    };
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (!state.isOnCooldown || state.remainingSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setState(prev => {
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          return {
            ...prev,
            isOnCooldown: false,
            remainingSeconds: 0,
          };
        }
        return {
          ...prev,
          remainingSeconds: newRemaining,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isOnCooldown, state.remainingSeconds]);

  /**
   * Start cooldown after a generation is initiated
   */
  const startCooldown = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(COOLDOWN_STORAGE_KEY, now.toString());
    
    setState({
      isOnCooldown: true,
      remainingSeconds: Math.ceil(COOLDOWN_DURATION_MS / 1000),
      lastGenerationTime: now,
    });
  }, []);

  /**
   * Check if cooldown is active (for validation before generation)
   */
  const checkCooldown = useCallback((): { allowed: boolean; remainingSeconds: number } => {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!stored) {
      return { allowed: true, remainingSeconds: 0 };
    }

    const lastTime = parseInt(stored, 10);
    const elapsed = Date.now() - lastTime;
    const remaining = Math.max(0, COOLDOWN_DURATION_MS - elapsed);

    if (remaining > 0) {
      return { 
        allowed: false, 
        remainingSeconds: Math.ceil(remaining / 1000) 
      };
    }

    return { allowed: true, remainingSeconds: 0 };
  }, []);

  /**
   * Reset cooldown (for admin bypass or testing)
   */
  const resetCooldown = useCallback(() => {
    localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    setState({
      isOnCooldown: false,
      remainingSeconds: 0,
      lastGenerationTime: null,
    });
  }, []);

  return {
    isOnCooldown: state.isOnCooldown,
    remainingSeconds: state.remainingSeconds,
    startCooldown,
    checkCooldown,
    resetCooldown,
    cooldownDuration: COOLDOWN_DURATION_MS / 1000,
  };
};
