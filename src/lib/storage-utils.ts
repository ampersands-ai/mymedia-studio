import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Generate a signed URL for secure access to storage files
 * @param bucket - Storage bucket name
 * @param filePath - File path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL with expiration
 */
export async function createSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 14400 // 4 hours for better video streaming
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      logger.error('Signed URL creation failed', error, {
        utility: 'storage-utils',
        bucket,
        filePath: filePath.substring(0, 50),
        operation: 'createSignedUrl'
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Signed URL generation exception', error as Error, {
      utility: 'storage-utils',
      bucket,
      filePath: filePath.substring(0, 50),
      operation: 'createSignedUrl'
    });
    return null;
  }
}

/**
 * Generate multiple signed URLs for a list of file paths
 * @param bucket - Storage bucket name
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Array of signed URLs
 */
export async function createSignedUrls(
  bucket: string,
  filePaths: string[],
  expiresIn: number = 14400 // 4 hours for better video streaming
): Promise<string[]> {
  const signedUrls = await Promise.all(
    filePaths.map(path => createSignedUrl(bucket, path, expiresIn))
  );

  return signedUrls.filter((url): url is string => url !== null);
}

/**
 * @deprecated Use useAudioUrl hook from @/hooks/media instead
 * This function constructs public URLs which won't work for private buckets
 * 
 * Get the public URL for a voice preview from Supabase Storage
 * @param voiceId - ElevenLabs voice ID
 * @returns Public URL to the voice preview audio file
 */
export function getVoicePreviewUrl(voiceId: string): string {
  logger.warn('Deprecated function called', {
    utility: 'storage-utils',
    function: 'getVoicePreviewUrl',
    voiceId,
    recommendation: 'Use useAudioUrl hook from @/hooks/media instead',
    operation: 'getVoicePreviewUrl'
  });
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/voice-previews/${voiceId}.mp3`;
}

/**
 * Extract file path from a storage URL or path string
 * Handles both public URLs and direct path strings
 */
export const extractStoragePath = (url: string | null): string => {
  if (!url) return '';
  
  try {
    // If it's already a simple path without URL, return it cleaned
    if (!url.startsWith('http')) {
      return url.split('?')[0].replace(/^\/+/, '');
    }
    
    // Parse URL and extract path
    const urlObj = new URL(url);
    
    // Try to match with bucket name in path
    const pathMatch = urlObj.pathname.match(/\/generated-content\/(.+)$/);
    if (pathMatch) {
      return pathMatch[1].split('?')[0];
    }
    
    // Fallback: try to match /object/public/{bucket}/{path}
    const publicMatch = urlObj.pathname.match(/\/object\/public\/[^/]+\/(.+)$/);
    if (publicMatch) {
      return publicMatch[1].split('?')[0];
    }
    
    // Last resort: clean the pathname
    return urlObj.pathname.split('?')[0].replace(/^\/+/, '');
  } catch (error) {
    logger.warn('Storage path extraction failed', {
      utility: 'storage-utils',
      url: url.substring(0, 50),
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'extractStoragePath'
    });
    // Return the original URL cleaned as fallback
    return url.split('?')[0].replace(/^\/+/, '');
  }
};
