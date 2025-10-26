import { useEffect, useRef, useState } from 'react';

interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  preventScroll?: boolean;
}

/**
 * Touch gesture detection hook for mobile interactions
 */
export function useTouchGestures(options: TouchGestureOptions = {}) {
  const { threshold = 50, preventScroll = false } = options;
  const ref = useRef<HTMLElement>(null);
  const [swipe, setSwipe] = useState<SwipeDirection>({ direction: null, distance: 0 });
  
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Velocity check (must be quick swipe)
      if (deltaTime > 300) return;
      
      // Determine direction
      if (absX > threshold || absY > threshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            setSwipe({ direction: 'right', distance: absX });
            options.onSwipeRight?.();
          } else {
            setSwipe({ direction: 'left', distance: absX });
            options.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            setSwipe({ direction: 'down', distance: absY });
            options.onSwipeDown?.();
          } else {
            setSwipe({ direction: 'up', distance: absY });
            options.onSwipeUp?.();
          }
        }
        
        // Reset after animation
        setTimeout(() => setSwipe({ direction: null, distance: 0 }), 300);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [options, threshold, preventScroll]);

  return { ref, swipe };
}

/**
 * Long press detection hook
 */
export function useLongPress(
  callback: () => void,
  options: { delay?: number } = {}
) {
  const { delay = 500 } = options;
  const ref = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleStart = () => {
      timeoutRef.current = setTimeout(callback, delay);
    };

    const handleEnd = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchend', handleEnd, { passive: true });
    element.addEventListener('touchcancel', handleEnd, { passive: true });
    element.addEventListener('mousedown', handleStart);
    element.addEventListener('mouseup', handleEnd);
    element.addEventListener('mouseleave', handleEnd);

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchcancel', handleEnd);
      element.removeEventListener('mousedown', handleStart);
      element.removeEventListener('mouseup', handleEnd);
      element.removeEventListener('mouseleave', handleEnd);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, delay]);

  return ref;
}
