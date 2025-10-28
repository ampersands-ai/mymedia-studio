import { supabase } from "@/integrations/supabase/client";

/**
 * Video optimization utilities for faster loading with CDN
 * - Direct public URLs (no signed URL overhead)
 * - Progressive MP4 support for streaming
 * - Fallback mechanisms for reliability
 */

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
  
  // Clean the storage path
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
