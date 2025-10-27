import { useEffect } from 'react';
import { prefetchOnIdle } from '@/utils/routePreload';

/**
 * Hook to prefetch critical routes on idle
 */
export function useRoutePreload() {
  useEffect(() => {
    // Prefetch likely routes after initial render
    prefetchOnIdle(() => import('../pages/Create'));
    prefetchOnIdle(() => import('../pages/Templates'), 3000);
    prefetchOnIdle(() => import('../pages/Pricing'), 4000);
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
