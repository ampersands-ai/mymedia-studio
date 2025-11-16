/**
 * Video-specific utilities
 * Extracted from supabase-videos.ts for modularity
 */

import { 
  getOptimizedVideoUrl as getSupabaseVideoUrl,
  getProxiedVideoUrl as getSupabaseProxiedUrl,
  detectConnectionSpeed,
  getPreloadStrategy,
  type ConnectionSpeed
} from '@/lib/supabase-videos';
import { type URLStrategy, type VideoMediaOptions } from './types';
import { MEDIA_CONFIG } from './config';

/**
 * Get video URL based on strategy
 */
export function getVideoUrl(
  storagePath: string,
  options: VideoMediaOptions = {}
): string {
  const {
    strategy = MEDIA_CONFIG.defaults.video,
    bucket = 'generated-content',
  } = options;

  // Route to correct function based on strategy
  switch (strategy) {
    case 'public-direct':
    case 'public-cdn':
      return getSupabaseVideoUrl(storagePath, bucket);
    
    case 'proxied-stream':
      return getSupabaseProxiedUrl(storagePath, bucket);
    
    case 'signed-short':
    case 'signed-long':
      // Signed URLs require async operation, handled by hook
      throw new Error('Signed URL strategy requires useVideoUrl hook');
    
    default:
      return getSupabaseVideoUrl(storagePath, bucket);
  }
}

/**
 * Get video preload strategy based on connection
 */
export function getVideoPreloadStrategy(): {
  connectionSpeed: ConnectionSpeed;
  preloadStrategy: 'none' | 'metadata' | 'auto';
} {
  const connectionSpeed = detectConnectionSpeed();
  const preloadStrategy = getPreloadStrategy(connectionSpeed);
  
  return { connectionSpeed, preloadStrategy };
}

/**
 * Check if video URL requires authentication
 */
export function requiresAuth(strategy: URLStrategy): boolean {
  return strategy === 'proxied-stream' || 
         strategy === 'signed-short' || 
         strategy === 'signed-long';
}
