import { useEffect } from 'react';
import { prefetchOnIdle } from '@/utils/routePreload';

/**
 * Hook to prefetch critical routes on idle
 * Delays prefetching until page is fully loaded and user has been idle
 */
export function useRoutePreload() {
  useEffect(() => {
    let hasLoaded = false;
    
    const handleLoad = () => {
      hasLoaded = true;
      // Wait 3 seconds after page load before starting prefetch
      setTimeout(() => {
        prefetchOnIdle(() => import('../pages/Create'), 5000);
        prefetchOnIdle(() => import('../pages/Templates'), 7000);
        prefetchOnIdle(() => import('../pages/Pricing'), 10000);
      }, 3000);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);
}

/**
 * Hook for hover-based preloading
 */
export function usePrefetchOnHover(routePath: string) {
  const routeMap: Record<string, () => Promise<any>> = {
    '/create': () => import('../pages/Create'),
    '/templates': () => import('../pages/Templates'),
    '/pricing': () => import('../pages/Pricing'),
    '/playground': () => import('../pages/Playground'),
    '/video-studio': () => import('../pages/VideoStudio'),
  };

  const handleMouseEnter = () => {
    const importFn = routeMap[routePath];
    if (importFn) {
      importFn().catch(() => {
        // Ignore prefetch errors
      });
    }
  };

  return { onMouseEnter: handleMouseEnter };
}
