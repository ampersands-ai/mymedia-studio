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
    prefetchOnIdle(() => import('../views/CustomCreation'), 1000);
    prefetchOnIdle(() => import('../views/StoryboardPage'), 1500);
    prefetchOnIdle(() => import('../views/VideoStudio'), 2000);
    prefetchOnIdle(() => import('../views/Settings'), 2500);
    prefetchOnIdle(() => import('../views/dashboard/History'), 3000);
    prefetchOnIdle(() => import('../views/BackgroundLibrary'), 3500);
    
    // Public routes
    prefetchOnIdle(() => import('../views/IndexV2'), 4000);
    prefetchOnIdle(() => import('../views/Templates'), 4500);
    prefetchOnIdle(() => import('../views/Pricing'), 5000);
    prefetchOnIdle(() => import('../views/Auth'), 5500);
  }, []);
}

/**
 * Hook for hover-based preloading
 */
export function usePrefetchOnHover(routePath: string) {
  const routeMap: Record<string, () => Promise<any>> = {
    '/': () => import('../views/IndexV2'),
    '/old-home': () => import('../views/IndexV2'),
    '/auth': () => import('../views/Auth'),
    '/templates': () => import('../views/Templates'),
    '/pricing': () => import('../views/Pricing'),
    '/playground': () => import('../views/Playground'),
    '/video-studio': () => import('../views/VideoStudio'),
    '/dashboard/custom-creation': () => import('../views/CustomCreation'),
    '/dashboard/storyboard': () => import('../views/StoryboardPage'),
    '/dashboard/faceless-video': () => import('../views/VideoStudio'),
    '/dashboard/history': () => import('../views/dashboard/History'),
    '/dashboard/backgrounds': () => import('../views/BackgroundLibrary'),
    '/settings': () => import('../views/Settings'),
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
