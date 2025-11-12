import { useEffect, useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { 
  detectConnectionSpeed, 
  getPreloadStrategy, 
  getPreloadMargin,
  type ConnectionSpeed 
} from '@/lib/supabase-videos';
import { logger } from '@/lib/logger';

interface UseVideoPreloadOptions {
  src: string;
  enabled?: boolean;
  threshold?: number;
}

/**
 * Smart video preloading hook with bandwidth awareness
 * Preloads video content based on connection speed and viewport proximity
 */
export function useVideoPreload({ 
  src, 
  enabled = true,
  threshold = 0.1 
}: UseVideoPreloadOptions) {
  const [connectionSpeed, setConnectionSpeed] = useState<ConnectionSpeed>('medium');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Detect connection speed on mount
  useEffect(() => {
    const speed = detectConnectionSpeed();
    setConnectionSpeed(speed);
    
    // Listen for connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const handleChange = () => {
        const newSpeed = detectConnectionSpeed();
        setConnectionSpeed(newSpeed);
      };
      
      connection?.addEventListener('change', handleChange);
      return () => connection?.removeEventListener('change', handleChange);
    }
  }, []);
  
  // Get adaptive preload settings
  const preloadStrategy = getPreloadStrategy(connectionSpeed);
  const rootMargin = getPreloadMargin(connectionSpeed);
  
  // Intersection observer with adaptive margin
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true, // Only preload once
  });
  
  // Preload video when in view (or approaching view)
  useEffect(() => {
    if (!enabled || !inView || isPreloaded || !src) {
      return;
    }
    
    // Create a hidden video element for preloading
    const video = document.createElement('video');
    video.preload = preloadStrategy;
    video.src = src;
    video.style.display = 'none';
    
    // Add to DOM to trigger loading
    document.body.appendChild(video);
    videoRef.current = video;
    
    const handleCanPlay = () => {
      setIsPreloaded(true);
      logger.debug('Video preloaded', {
        component: 'useVideoPreload',
        operation: 'preload',
        connectionSpeed,
        src: src.substring(0, 100)
      });
    };
    
    video.addEventListener('canplay', handleCanPlay);
    
    // Cleanup
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      videoRef.current = null;
    };
  }, [inView, enabled, isPreloaded, src, preloadStrategy, connectionSpeed]);
  
  return {
    ref, // Attach to container element
    isPreloaded,
    connectionSpeed,
    preloadStrategy,
    inView
  };
}
