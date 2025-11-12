import { useState, useEffect } from 'react';
import { getAudioUrl } from '@/lib/media/audio';
import { createSignedUrl } from '@/lib/storage-utils';
import { type AudioMediaOptions } from '@/lib/media/types';
import { MEDIA_CONFIG } from '@/lib/media/config';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'useAudioUrl' });

interface UseAudioUrlResult {
  url: string | null;
  isLoading: boolean;
  error: boolean;
}

/**
 * Audio-specific URL hook
 * Replaces useSignedUrl for audio content
 */
export function useAudioUrl(
  storagePath: string | null,
  options: AudioMediaOptions = {}
): UseAudioUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const {
    strategy = MEDIA_CONFIG.defaults.audio,
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
          // For public strategies
          const publicUrl = getAudioUrl(storagePath, { strategy, bucket });
          setUrl(publicUrl);
        }
      } catch (err) {
        componentLogger.error('Audio URL fetch failed', err, {
          operation: 'fetchUrl',
          storagePath,
          strategy,
          bucket
        });
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
