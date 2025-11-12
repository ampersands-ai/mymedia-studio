import { useState, useEffect } from 'react';
import { createSignedUrl } from '@/lib/storage-utils';
import { getOptimizedVideoUrl, getProxiedVideoUrl } from '@/lib/supabase-videos';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'useSignedUrl' });

/**
 * @deprecated Use content-specific hooks from @/hooks/media instead:
 * - useImageUrl for images
 * - useVideoUrl for videos
 * - useAudioUrl for audio
 * 
 * This hook will be removed in a future version.
 * 
 * Hook to fetch a signed URL for a storage file
 * @param storagePath - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Signed URL or null
 */
export const useSignedUrl = (storagePath: string | null, bucket: string = 'generated-content') => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Deprecation warning in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      componentLogger.warn('useSignedUrl is deprecated, use content-specific hooks', {
        operation: 'deprecationWarning',
        storagePath,
        bucket
      });
    }
  }, [storagePath, bucket]);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      setError(false);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      try {
        // Extract the actual storage path if it's a full URL
        let actualPath = storagePath;
        
        // If it's a full URL, try to extract the path
        if (storagePath.includes('/storage/v1/object/public/')) {
          const pathMatch = storagePath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            actualPath = pathMatch[1];
          }
        } else if (storagePath.includes(`/${bucket}/`)) {
          const pathMatch = storagePath.split(`/${bucket}/`)[1];
          if (pathMatch) {
            actualPath = pathMatch;
          }
        }

        // For generated-content bucket, prefer public URL (CDN-optimized)
        if (bucket === 'generated-content') {
          const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
          setSignedUrl(publicUrl);
          setError(false);
          setIsLoading(false);
          return;
        }

        // For other buckets, use signed URLs
        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          componentLogger.warn('Signed URL creation failed, using public URL fallback', {
            operation: 'fetchSignedUrl',
            bucket,
            actualPath
          });
          // Fallback to public URL if bucket is public
          const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
          setSignedUrl(publicUrl);
          setError(false);
        } else {
          setSignedUrl(url);
          setError(false);
        }
      } catch (error) {
        componentLogger.error('Signed URL fetch failed', error, {
          operation: 'fetchSignedUrl',
          bucket,
          storagePath
        });
        setError(true);
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storagePath, bucket]);

  return { signedUrl, isLoading, error };
};
