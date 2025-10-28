import { useState, useEffect } from 'react';
import { createSignedUrl } from '@/lib/storage-utils';
import { getOptimizedVideoUrl, getProxiedVideoUrl } from '@/lib/supabase-videos';

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

        // For generated-content bucket with video files, use proxied streaming
        if (bucket === 'generated-content') {
          const isVideo = actualPath.endsWith('.mp4') || actualPath.endsWith('.webm') || actualPath.endsWith('.mov');
          
          if (isVideo) {
            // Use proxied streaming for better caching and reliability
            const proxiedUrl = getProxiedVideoUrl(actualPath, bucket);
            setSignedUrl(proxiedUrl);
            setError(false);
            setIsLoading(false);
            return;
          } else {
            // For non-video content (images, audio), use direct public URL
            const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
            setSignedUrl(publicUrl);
            setError(false);
            setIsLoading(false);
            return;
          }
        }

        // For other buckets, use signed URLs
        const url = await createSignedUrl(bucket, actualPath, 14400);
        
        if (!url) {
          console.warn('Failed to create signed URL, trying public URL:', actualPath);
          // Fallback to public URL if bucket is public
          const publicUrl = getOptimizedVideoUrl(actualPath, bucket);
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
