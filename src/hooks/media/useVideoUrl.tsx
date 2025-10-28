import { useState, useEffect } from 'react';
import { getVideoUrl, requiresAuth } from '@/lib/media/videos';
import { createSignedUrl } from '@/lib/storage-utils';
import { type VideoMediaOptions } from '@/lib/media/types';
import { MEDIA_CONFIG } from '@/lib/media/config';

interface UseVideoUrlResult {
  url: string | null;
  isLoading: boolean;
  error: boolean;
}

/**
 * Video-specific URL hook with strategy-based fetching
 * Replaces useSignedUrl for video content
 */
export function useVideoUrl(
  storagePath: string | null,
  options: VideoMediaOptions = {}
): UseVideoUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const {
    strategy = MEDIA_CONFIG.defaults.video,
    bucket = 'generated-content',
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

        // For strategies that need authentication, create signed URL
        if (requiresAuth(strategy)) {
          const ttl = strategy === 'signed-long' 
            ? MEDIA_CONFIG.cache.longSignedUrlTTL 
            : MEDIA_CONFIG.cache.signedUrlTTL;
          
          const signedUrl = await createSignedUrl(bucket, storagePath, ttl);
          if (!signedUrl) {
            throw new Error('Failed to create signed URL');
          }
          
          setUrl(signedUrl);
        } else {
          // For public strategies, generate URL directly
          const publicUrl = getVideoUrl(storagePath, { strategy, bucket });
          setUrl(publicUrl);
        }
      } catch (err) {
        console.error('[useVideoUrl] Error fetching video URL:', err);
        setError(true);
        setUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUrl();
  }, [storagePath, strategy, bucket]);

  return { url, isLoading, error };
}
