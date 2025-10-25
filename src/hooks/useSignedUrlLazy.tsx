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
        // If already an absolute URL, use it directly
        if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
          console.log(`[useSignedUrlLazy] Using absolute URL directly: ${storagePath}`);
          setSignedUrl(storagePath);
          setError(false);
          setIsLoading(false);
          return;
        }

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
        }

        console.log(`[useSignedUrlLazy] Fetching signed URL for bucket: ${bucket}, path: ${actualPath} (original: ${storagePath})`);
        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          // Fallback to public URL construction
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${actualPath}`;
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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${actualPath}`;
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
