import { useEffect } from 'react';
import { prefetchOnIdle } from '@/utils/routePreload';
import { logger } from '@/lib/logger';

const preloadHookLogger = logger.child({ component: 'useRoutePreload' });

/**
 * Hook to prefetch critical routes on idle
 */
export function useRoutePreload() {
  useEffect(() => {
    // Prefetch critical routes after initial render
    // Dashboard routes (most likely navigation targets)
    prefetchOnIdle(() => import('../pages/CustomCreation'), 1000);
    prefetchOnIdle(() => import('../pages/StoryboardPage'), 1500);
    prefetchOnIdle(() => import('../pages/VideoStudio'), 2000);
    prefetchOnIdle(() => import('../pages/Settings'), 2500);
    prefetchOnIdle(() => import('../pages/dashboard/History'), 3000);
    
    // Public routes
    prefetchOnIdle(() => import('../pages/IndexV2'), 3500);
    prefetchOnIdle(() => import('../pages/Create'), 4000);
    prefetchOnIdle(() => import('../pages/Templates'), 4500);
    prefetchOnIdle(() => import('../pages/Pricing'), 5000);
    prefetchOnIdle(() => import('../pages/Auth'), 5500);
  }, []);
}

/**
 * Hook for hover-based preloading
 */
export function usePrefetchOnHover(routePath: string) {
  const routeMap: Record<string, () => Promise<any>> = {
    '/': () => import('../pages/IndexV2'),
    '/old-home': () => import('../pages/IndexV2'),
    '/auth': () => import('../pages/Auth'),
    '/create': () => import('../pages/Create'),
    '/templates': () => import('../pages/Templates'),
    '/pricing': () => import('../pages/Pricing'),
    '/playground': () => import('../pages/Playground'),
    '/video-studio': () => import('../pages/VideoStudio'),
    '/dashboard/custom-creation': () => import('../pages/CustomCreation'),
    '/dashboard/storyboard': () => import('../pages/StoryboardPage'),
    '/dashboard/faceless-video': () => import('../pages/VideoStudio'),
    '/dashboard/history': () => import('../pages/dashboard/History'),
    '/settings': () => import('../pages/Settings'),
  };

  const handleMouseEnter = async () => {
    const importFn = routeMap[routePath];
    if (importFn) {
      try {
        await importFn();
      } catch (err) {
        // Non-critical: prefetch failures are acceptable
        preloadHookLogger.debug('Hover prefetch failed (non-critical)', {
          routePath,
          error: (err as Error).message,
          operation: 'usePrefetchOnHover'
        });
      }
    }
  };

  return { onMouseEnter: handleMouseEnter };
}
