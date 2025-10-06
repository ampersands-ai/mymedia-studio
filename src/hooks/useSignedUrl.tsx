import { useState, useEffect } from 'react';
import { createSignedUrl } from '@/lib/storage-utils';

/**
 * Hook to fetch a signed URL for a storage file
 * @param storagePath - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Signed URL or null
 */
export const useSignedUrl = (storagePath: string | null, bucket: string = 'generated-content') => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
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

        const url = await createSignedUrl(bucket, actualPath, 3600);
        setSignedUrl(url);
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        // Fallback to original URL if signed URL fails
        setSignedUrl(storagePath);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storagePath, bucket]);

  return { signedUrl, isLoading };
};
