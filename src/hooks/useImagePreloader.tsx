import { useEffect, useState } from 'react';

interface UseImagePreloaderOptions {
  timeout?: number;
  minLoadedPercentage?: number;
}

/**
 * Preloads images and tracks loading progress
 * Shows content only after images are loaded or timeout occurs
 */
export function useImagePreloader(
  imageUrls: (string | null | undefined)[],
  options: UseImagePreloaderOptions = {}
) {
  const { timeout = 5000, minLoadedPercentage = 80 } = options;
  
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  // Filter out null/undefined URLs
  const validUrls = imageUrls.filter((url): url is string => !!url);
  const totalImages = validUrls.length;
  
  useEffect(() => {
    // No images to load
    if (totalImages === 0) {
      setIsLoading(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    const images: HTMLImageElement[] = [];
    
    // Set timeout fallback
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setHasTimedOut(true);
        setIsLoading(false);
      }
    }, timeout);
    
    // Preload all images
    validUrls.forEach((url, index) => {
      const img = new Image();
      images.push(img);
      
      const handleLoad = () => {
        if (!isMounted) return;
        
        setLoadedCount(prev => {
          const newCount = prev + 1;
          const percentage = (newCount / totalImages) * 100;
          
          // Check if we've loaded enough images
          if (percentage >= minLoadedPercentage) {
            clearTimeout(timeoutId);
            setIsLoading(false);
          }
          
          return newCount;
        });
      };
      
      const handleError = () => {
        // Count errors as "loaded" to prevent blocking
        if (!isMounted) return;
        handleLoad();
      };
      
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
      img.src = url;
    });
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      images.forEach(img => {
        img.src = '';
      });
    };
  }, [validUrls.join(','), timeout, minLoadedPercentage, totalImages]);
  
  return {
    isLoading,
    progress: totalImages > 0 ? (loadedCount / totalImages) * 100 : 100,
    loadedCount,
    totalImages,
    hasTimedOut
  };
}
