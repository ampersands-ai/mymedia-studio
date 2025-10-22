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
  options: { triggerOnce?: boolean; rootMargin?: string } = {}
) => {
  const { ref, inView } = useInView({
    triggerOnce: options.triggerOnce ?? true,
    rootMargin: options.rootMargin ?? '200px', // Start loading 200px before entering viewport
  });
  
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storagePath || !inView) {
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
        }

        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          setError(true);
          setSignedUrl(null);
        } else {
          setSignedUrl(url);
          setError(false);
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        setError(true);
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storagePath, bucket, inView]);

  return { ref, signedUrl, isLoading, error, inView };
};
