/**
 * Route Preloading Utilities
 * Preload critical chunks to avoid loading waterfalls
 */

import { logger } from '@/lib/logger';

const preloadLogger = logger.child({ component: 'routePreload' });

export function preloadRoute(chunkName: string) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.as = 'script';
  link.crossOrigin = 'anonymous';
  // Vite will handle the actual chunk URL resolution
  link.href = `/src/pages/${chunkName}.tsx`;
  document.head.appendChild(link);
}

export function preloadChunk(chunkPath: string) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.as = 'script';
  link.crossOrigin = 'anonymous';
  link.href = chunkPath;
  document.head.appendChild(link);
}

/**
 * Prefetch routes on idle
 */
export function prefetchOnIdle(importFn: () => Promise<any>, timeout = 2000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      async () => {
        try {
          await importFn();
        } catch (err) {
          // Non-critical: prefetch failures are acceptable
          preloadLogger.debug('Prefetch failed (non-critical)', {
            error: (err as Error).message,
            operation: 'prefetchOnIdle'
          });
        }
      },
      { timeout }
    );
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      try {
        await importFn();
      } catch (err) {
        // Non-critical: prefetch failures are acceptable
        preloadLogger.debug('Prefetch failed (non-critical)', {
          error: (err as Error).message,
          operation: 'prefetchOnIdle-fallback'
        });
      }
    }, timeout);
  }
}

/**
 * Preload route on hover
 */
export async function preloadOnHover(routePath: string): Promise<void> {
  const routeMap: Record<string, () => Promise<any>> = {
    '/create': () => import('../pages/Create'),
    '/templates': () => import('../pages/Templates'),
    '/pricing': () => import('../pages/Pricing'),
    '/playground': () => import('../pages/Playground'),
    '/video-studio': () => import('../pages/VideoStudio'),
  };

  const importFn = routeMap[routePath];
  if (importFn) {
    try {
      await importFn();
    } catch (err) {
      // Non-critical: preload failures are acceptable
      preloadLogger.debug('Hover preload failed (non-critical)', {
        routePath,
        error: (err as Error).message,
        operation: 'preloadOnHover'
      });
    }
  }
}
