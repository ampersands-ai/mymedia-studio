import { supabase } from "@/integrations/supabase/client";

/**
 * Video optimization utilities for faster loading with CDN
 * - Direct public URLs (no signed URL overhead)
 * - Progressive MP4 support for streaming
 * - Fallback mechanisms for reliability
 */

/**
 * Clean storage path helper (shared logic)
 */
function cleanStoragePath(storagePath: string, bucket: string = 'generated-content'): string {
  let cleanPath = storagePath;
  
  // Extract path if it's already a full URL
  if (storagePath.includes('/storage/v1/object/public/')) {
    const pathMatch = storagePath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (pathMatch) {
      cleanPath = pathMatch[1];
    }
  } else if (storagePath.includes(`/${bucket}/`)) {
    const pathMatch = storagePath.split(`/${bucket}/`)[1];
    if (pathMatch) {
      cleanPath = pathMatch;
    }
  }
  
  return cleanPath;
}

/**
 * Get optimized public video URL with CDN caching
 * @param storagePath - Path to video file in storage bucket
 * @param bucket - Storage bucket name (default: 'generated-content')
 * @returns Direct public URL for video
 */
export function getOptimizedVideoUrl(
  storagePath: string,
  bucket: string = 'generated-content'
): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const cleanPath = cleanStoragePath(storagePath, bucket);
  
  // Return direct public URL - Supabase Storage CDN handles caching
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Get optimized audio URL with CDN caching
 * @param storagePath - Path to audio file in storage bucket
 * @param bucket - Storage bucket name (default: 'generated-content')
 * @returns Direct public URL for audio
 */
export function getOptimizedAudioUrl(
  storagePath: string,
  bucket: string = 'generated-content'
): string {
  // Reuse video URL logic since both are media files
  return getOptimizedVideoUrl(storagePath, bucket);
}

/**
 * Get proxied video URL through stream-content edge function (fallback option)
 * Use this for private buckets or when you need guaranteed CDN caching
 * Primary method should still be direct public URLs (faster)
 * @param storagePath - Path to video file in storage bucket
 * @param bucket - Storage bucket name (default: 'generated-content')
 * @returns Proxied URL through edge function with aggressive caching
 */
export function getProxiedVideoUrl(
  storagePath: string,
  bucket: string = 'generated-content'
): string {
  const cleanPath = cleanStoragePath(storagePath, bucket);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // Use stream-content edge function for proxied access with aggressive caching
  return `${supabaseUrl}/functions/v1/stream-content?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`;
}

/**
 * Check if a bucket is public
 * @param bucket - Bucket name to check
 * @returns Promise<boolean> indicating if bucket is public
 */
export async function isBucketPublic(bucket: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket(bucket);
    
    if (error) {
      console.warn(`Failed to check bucket visibility for ${bucket}:`, error);
      return false;
    }
    
    return data?.public ?? false;
  } catch (error) {
    console.error(`Error checking bucket visibility:`, error);
    return false;
  }
}

/**
 * Get video URL with fallback logic
 * Tries public URL first, falls back to signed URL if needed
 * @param storagePath - Path to video file
 * @param bucket - Storage bucket name
 * @returns Promise<string> - Best available video URL
 */
export async function getVideoUrlWithFallback(
  storagePath: string,
  bucket: string = 'generated-content'
): Promise<string> {
  try {
    // First, try to use public URL if bucket is public
    const isPublic = await isBucketPublic(bucket);
    
    if (isPublic) {
      return getOptimizedVideoUrl(storagePath, bucket);
    }
    
    // Fallback to signed URL for private buckets
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 14400); // 4 hours
    
    if (error || !data?.signedUrl) {
      // Last resort: try public URL anyway
      console.warn('Signed URL creation failed, attempting public URL');
      return getOptimizedVideoUrl(storagePath, bucket);
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting video URL:', error);
    // Final fallback: return public URL
    return getOptimizedVideoUrl(storagePath, bucket);
  }
}

/**
 * Validate if a video is progressive MP4 (moov atom at start)
 * Note: This requires fetching video metadata, use sparingly
 * @param videoUrl - URL to video file
 * @returns Promise<boolean> indicating progressive MP4 status
 */
export async function isProgressiveMp4(videoUrl: string): Promise<boolean> {
  try {
    // Fetch first 64KB to check for moov atom near start
    const response = await fetch(videoUrl, {
      headers: { Range: 'bytes=0-65535' }
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch video header for progressive check');
      return false;
    }
    
    const buffer = await response.arrayBuffer();
    const view = new Uint8Array(buffer);
    
    // Look for 'moov' atom in first 64KB (progressive MP4 has it at start)
    const moovSignature = [0x6D, 0x6F, 0x6F, 0x76]; // 'moov' in hex
    
    for (let i = 0; i < view.length - 4; i++) {
      if (
        view[i] === moovSignature[0] &&
        view[i + 1] === moovSignature[1] &&
        view[i + 2] === moovSignature[2] &&
        view[i + 3] === moovSignature[3]
      ) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking progressive MP4:', error);
    return false; // Assume not progressive on error
  }
}

/**
 * Generate poster/thumbnail URL for video
 * Uses Supabase Storage image transformation on first frame
 * @param storagePath - Path to video file
 * @param bucket - Storage bucket name
 * @returns Thumbnail URL (or null if not supported)
 */
export function getVideoThumbnail(
  storagePath: string,
  bucket: string = 'generated-content'
): string | null {
  // Note: Supabase doesn't support video thumbnail generation yet
  // This is a placeholder for future implementation
  // For now, return null and let video poster attribute handle it
  return null;
}

/**
 * Bandwidth detection utilities for adaptive video loading
 */

export type ConnectionSpeed = 'slow' | 'medium' | 'fast';

/**
 * Detect user's connection speed using Network Information API
 * @returns ConnectionSpeed estimate
 */
export function detectConnectionSpeed(): ConnectionSpeed {
  // Check if Network Information API is available
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    
    if (connection) {
      // effectiveType: 'slow-2g', '2g', '3g', '4g'
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      } else if (effectiveType === '3g') {
        return 'medium';
      } else {
        return 'fast'; // 4g or better
      }
    }
  }
  
  // Fallback: assume medium if API not available
  return 'medium';
}

/**
 * Get optimal preload strategy based on connection speed
 * @param speed - Connection speed
 * @returns Preload strategy ('none', 'metadata', 'auto')
 */
export function getPreloadStrategy(speed: ConnectionSpeed): 'none' | 'metadata' | 'auto' {
  const strategies = {
    slow: 'none' as const,      // Don't preload on slow connections
    medium: 'metadata' as const, // Preload metadata only
    fast: 'metadata' as const    // Still use metadata for optimal performance
  };
  
  return strategies[speed];
}

/**
 * Calculate optimal intersection observer rootMargin based on connection speed
 * @param speed - Connection speed
 * @returns Root margin value (e.g., "200px")
 */
export function getPreloadMargin(speed: ConnectionSpeed): string {
  const margins = {
    slow: '50px',   // Start loading just before visible
    medium: '200px', // Standard preload distance
    fast: '400px'    // Aggressive preload for fast connections
  };
  
  return margins[speed];
}

/**
 * Check if device is likely mobile (for bandwidth considerations)
 * @returns Boolean indicating if mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get recommended video quality based on connection and device
 * @returns Quality recommendation
 */
export function getRecommendedQuality(): 'low' | 'medium' | 'high' {
  const speed = detectConnectionSpeed();
  const isMobile = isMobileDevice();
  
  if (speed === 'slow' || (isMobile && speed === 'medium')) {
    return 'low';
  } else if (speed === 'medium') {
    return 'medium';
  } else {
    return 'high';
  }
}
