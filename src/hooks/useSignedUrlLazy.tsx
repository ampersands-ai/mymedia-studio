import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { createSignedUrl } from '@/lib/storage-utils';
import { getOptimizedVideoUrl } from '@/lib/supabase-videos';

/**
 * @deprecated Use content-specific hooks from @/hooks/media instead:
 * - useImageUrl for images (supports lazy loading)
 * - useVideoUrl for videos (supports lazy loading)
 * - useAudioUrl for audio
 * 
 * This hook will be removed in a future version.
 * 
 * Hook to lazily fetch a signed URL when the element enters the viewport
 * @param storagePath - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Signed URL, loading state, error state, and ref for intersection observer
 */
export const useSignedUrlLazy = (
  storagePath: string | null, 
  bucket: string = 'generated-content',
  options: { triggerOnce?: boolean; rootMargin?: string; immediate?: boolean } = {}
) => {
  const { ref, inView } = useInView({
    triggerOnce: options.triggerOnce ?? true,
    rootMargin: options.rootMargin ?? '200px', // Start loading 200px before entering viewport
  });
  
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Deprecation warning in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn(
        '⚠️ useSignedUrlLazy is deprecated. Use content-specific hooks from @/hooks/media instead:\n' +
        '  - useImageUrl for images (supports lazy loading)\n' +
        '  - useVideoUrl for videos (supports lazy loading)\n' +
        '  - useAudioUrl for audio'
      );
    }
  }, []);

  useEffect(() => {
    if (!storagePath) {
      return;
    }

    // Allow immediate fetch or wait for inView
    if (!options.immediate && !inView) {
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      try {
        let actualPath = storagePath;
        
        // Case 1: Already an absolute URL - use it directly
        if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
          console.log(`[useSignedUrlLazy] Using absolute URL directly: ${storagePath}`);
          setSignedUrl(storagePath);
          setError(false);
          setIsLoading(false);
          return;
        }

        // Case 2: Full storage URL format (contains /storage/v1/object/public/)
        if (storagePath.includes('/storage/v1/object/public/')) {
          const pathMatch = storagePath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            actualPath = pathMatch[1];
            console.log(`[useSignedUrlLazy] Extracted path from storage URL: ${actualPath}`);
          }
        } 
        // Case 3: Relative path with bucket name
        else if (storagePath.includes(`/${bucket}/`)) {
          const pathMatch = storagePath.split(`/${bucket}/`)[1];
          if (pathMatch) {
            actualPath = pathMatch;
            console.log(`[useSignedUrlLazy] Extracted path from bucket reference: ${actualPath}`);
          }
        }
        // Case 4: Pure filename (no slashes, no http) - CRITICAL FIX
        else if (!storagePath.includes('/')) {
          actualPath = storagePath;
          console.log(`[useSignedUrlLazy] Detected filename-only input: "${storagePath}"`);
        }

        // For generated-content bucket, prefer public URL (CDN-optimized)
        if (bucket === 'generated-content') {
          const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
          console.log(`[useSignedUrlLazy] Using optimized public URL: ${publicUrl}`);
          setSignedUrl(publicUrl);
          setError(false);
          setIsLoading(false);
          return;
        }

        console.log(`[useSignedUrlLazy] Fetching signed URL for bucket: ${bucket}, path: ${actualPath} (original: ${storagePath})`);
        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          // Fallback to public URL construction
          const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
          console.log(`[useSignedUrlLazy] Signed URL generation failed, using public URL: ${publicUrl}`);
          setSignedUrl(publicUrl);
          setError(false);
        } else {
          setSignedUrl(url);
          setError(false);
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        // Fallback to public URL construction on error
        let actualPath = storagePath;
        
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
        
        const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
        console.log(`[useSignedUrlLazy] Error caught, using public URL fallback: ${publicUrl}`);
        setSignedUrl(publicUrl);
        setError(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storagePath, bucket, inView, options.immediate]);

  return { ref, signedUrl, isLoading, error, inView };
};
