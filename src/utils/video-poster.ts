import { logger } from '@/lib/logger';

/**
 * Client-side video poster frame extraction utilities
 * Generates thumbnail images from video first frame
 */

/**
 * Extract poster frame from video URL
 * @param videoUrl - URL to video file
 * @param timeOffset - Time in seconds to capture (default: 0 for first frame)
 * @returns Promise<string> - Data URL of extracted frame
 */
export async function extractPosterFrame(
  videoUrl: string,
  timeOffset: number = 0
): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    
    let resolved = false;
    
    const cleanup = () => {
      video.remove();
    };
    
    video.onloadedmetadata = () => {
      // Ensure we don't seek beyond video duration
      video.currentTime = Math.min(timeOffset, video.duration);
    };
    
    video.onseeked = () => {
      if (resolved) return;
      resolved = true;
      
      try {
        // Create canvas and extract frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL (JPEG for smaller size)
        const posterUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        cleanup();
        resolve(posterUrl);
      } catch (error) {
        logger.error('Failed to extract poster frame', error as Error, {
          component: 'video-poster',
          operation: 'extractPosterFrame',
          videoUrl: videoUrl.substring(0, 100)
        });
        cleanup();
        resolve(null);
      }
    };
    
    video.onerror = () => {
      if (resolved) return;
      resolved = true;
      logger.error('Video load error during poster extraction', new Error('Video failed to load'), {
        component: 'video-poster',
        operation: 'extractPosterFrame',
        videoUrl: videoUrl.substring(0, 100)
      });
      cleanup();
      resolve(null);
    };
    
    // Start loading
    video.src = videoUrl;
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 10000);
  });
}

/**
 * Generate blur placeholder from poster frame
 * @param posterDataUrl - Data URL of poster image
 * @returns Promise<string> - Blurred data URL
 */
export async function generateBlurPlaceholder(
  posterDataUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Create small canvas for blur effect
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Draw scaled-down image
      ctx.drawImage(img, 0, 0, 40, 40);
      
      // Apply blur effect via CSS filter (rendered to canvas)
      ctx.filter = 'blur(10px)';
      ctx.drawImage(canvas, 0, 0);
      
      // Convert to low-quality data URL
      const blurUrl = canvas.toDataURL('image/jpeg', 0.1);
      resolve(blurUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load poster image'));
    };
    
    img.src = posterDataUrl;
  });
}

/**
 * Cache poster frames in sessionStorage for faster subsequent loads
 */
export class PosterCache {
  private static readonly CACHE_PREFIX = 'video_poster_';
  private static readonly MAX_AGE = 1000 * 60 * 30; // 30 minutes
  
  static set(videoUrl: string, posterDataUrl: string): void {
    try {
      const cacheEntry = {
        poster: posterDataUrl,
        timestamp: Date.now()
      };
      sessionStorage.setItem(
        this.CACHE_PREFIX + this.hashUrl(videoUrl),
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      logger.warn('Failed to cache poster', {
        component: 'PosterCache',
        operation: 'set',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  static get(videoUrl: string): string | null {
    try {
      const cached = sessionStorage.getItem(
        this.CACHE_PREFIX + this.hashUrl(videoUrl)
      );
      
      if (!cached) return null;
      
      const entry = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;
      
      // Check if cache is still valid
      if (age > this.MAX_AGE) {
        this.remove(videoUrl);
        return null;
      }
      
      return entry.poster;
    } catch (error) {
      logger.warn('Failed to retrieve cached poster', {
        component: 'PosterCache',
        operation: 'get',
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
  
  static remove(videoUrl: string): void {
    try {
      sessionStorage.removeItem(
        this.CACHE_PREFIX + this.hashUrl(videoUrl)
      );
    } catch (error) {
      logger.warn('Failed to remove cached poster', {
        component: 'PosterCache',
        operation: 'remove',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  static clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.warn('Failed to clear poster cache', {
        component: 'PosterCache',
        operation: 'clear',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private static hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
