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
  const [error, setError] = useState(false);

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

        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          console.warn('Failed to create signed URL, trying public URL:', actualPath);
          // Fallback to public URL if bucket is public
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${actualPath}`;
          setSignedUrl(publicUrl);
          setError(false);
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
  }, [storagePath, bucket]);

  return { signedUrl, isLoading, error };
};
