import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { config } from '@/config';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

/**
 * Centralized storage manager for Supabase storage operations
 * Provides signed URL caching and unified storage access
 */
export class StorageManager {
  private static signedUrlCache = new Map<string, CachedUrl>();

  /**
   * Get a signed URL for a storage path with automatic caching
   * 
   * @param path - Storage path
   * @param bucket - Storage bucket name
   * @param expiresIn - URL expiry time in seconds
   * @returns Signed URL
   * 
   * @throws {Error} If URL generation fails
   */
  static async getSignedUrl(
    path: string,
    bucket: string = 'generated-content',
    expiresIn: number = config.urls.signedUrlExpiry
  ): Promise<string> {
    const cacheKey = `${bucket}:${path}`;
    
    // Check cache
    const cached = this.signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('Using cached signed URL', { path, bucket });
      return cached.url;
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('No signed URL returned');

      // Cache with safety margin (80% of expiry time)
      const expiresAt = Date.now() + (expiresIn * config.urls.cacheMargin * 1000);
      this.signedUrlCache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt,
      });

      logger.debug('Generated new signed URL', { path, bucket, expiresIn });
      return data.signedUrl;
    } catch (error) {
      logger.error('Failed to get signed URL', error as Error, { path, bucket });
      throw error;
    }
  }

  /**
   * Get public URL for a storage path
   * 
   * @param path - Storage path
   * @param bucket - Storage bucket name
   * @returns Public URL
   */
  static getPublicUrl(path: string, bucket: string = 'generated-content'): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Clear all cached signed URLs
   */
  static clearCache(): void {
    this.signedUrlCache.clear();
    logger.debug('Cleared signed URL cache');
  }

  /**
   * Clear cached URL for specific path
   */
  static clearCacheForPath(path: string, bucket: string = 'generated-content'): void {
    const cacheKey = `${bucket}:${path}`;
    this.signedUrlCache.delete(cacheKey);
    logger.debug('Cleared cached URL', { path, bucket });
  }
}
