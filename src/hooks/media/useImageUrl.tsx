import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/media/images';
import { createSignedUrl } from '@/lib/storage-utils';
import { type ImageMediaOptions } from '@/lib/media/types';
import { MEDIA_CONFIG } from '@/lib/media/config';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'useImageUrl' });

interface UseImageUrlResult {
  url: string | null;
  isLoading: boolean;
  error: boolean;
}

/**
 * Image-specific URL hook with CDN transforms
 * Replaces useSignedUrl for image content
 */
export function useImageUrl(
  storagePath: string | null,
  options: ImageMediaOptions = {}
): UseImageUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const {
    strategy = MEDIA_CONFIG.defaults.image,
    bucket = 'generated-content',
    width,
    height,
    quality,
    format,
    resize,
  } = options;

  useEffect(() => {
    if (!storagePath) {
      setUrl(null);
      setIsLoading(false);
      setError(false);
      return;
    }

    const fetchUrl = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // For strategies requiring authentication
        if (strategy === 'signed-short' || strategy === 'signed-long') {
          const ttl = strategy === 'signed-long' 
            ? MEDIA_CONFIG.cache.longSignedUrlTTL 
            : MEDIA_CONFIG.cache.signedUrlTTL;
          
          const signedUrl = await createSignedUrl(bucket, storagePath, ttl);
          if (!signedUrl) {
            throw new Error('Failed to create signed URL');
          }
          
          setUrl(signedUrl);
        } else {
          // For public strategies with transforms
          const publicUrl = getImageUrl(storagePath, {
            strategy,
            bucket,
            width,
            height,
            quality,
            format,
            resize,
          });
          setUrl(publicUrl);
        }
      } catch (err) {
        componentLogger.error('Image URL fetch failed', err, {
          operation: 'fetchUrl',
          storagePath,
          strategy,
          bucket,
          width,
          height
        });
        setError(true);
        setUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUrl();
  }, [storagePath, strategy, bucket, width, height, quality, format, resize]);

  return { url, isLoading, error };
}
