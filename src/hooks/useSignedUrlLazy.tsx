import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { createSignedUrl } from '@/lib/storage-utils';

/**
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
        // Extract the actual storage path if it's a full URL
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
        } else if (storagePath.startsWith(`${bucket}/`)) {
          // Handle: bucket/path (without leading slash)
          actualPath = storagePath.substring(bucket.length + 1);
        }

        console.debug('useSignedUrlLazy: storagePath:', storagePath);
        console.debug('useSignedUrlLazy: actualPath:', actualPath);

        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          console.debug('useSignedUrlLazy: Signed URL failed, falling back to public URL');
          // Fallback to public URL if signed URL generation fails
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${actualPath}`;
          setSignedUrl(publicUrl);
          setError(false);
          console.debug('useSignedUrlLazy: Using public URL:', publicUrl);
        } else {
          setSignedUrl(url);
          setError(false);
          console.debug('useSignedUrlLazy: Using signed URL');
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        // Fallback to public URL on error
        try {
          let actualPath = storagePath;
          if (storagePath.startsWith(`${bucket}/`)) {
            actualPath = storagePath.substring(bucket.length + 1);
          }
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${actualPath}`;
          setSignedUrl(publicUrl);
          setError(false);
          console.debug('useSignedUrlLazy: Error fallback to public URL:', publicUrl);
        } catch (fallbackError) {
          console.error('Fallback URL generation failed:', fallbackError);
          setError(true);
          setSignedUrl(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storagePath, bucket, inView, options.immediate]);

  return { ref, signedUrl, isLoading, error, inView };
};
