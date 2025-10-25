/**
 * Route Preloading Utilities
 * Preload critical chunks to avoid loading waterfalls
 */

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
      () => {
        importFn().catch(() => {
          // Ignore prefetch errors
        });
      },
      { timeout }
    );
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFn().catch(() => {});
    }, timeout);
  }
}

/**
 * Preload route on hover
 */
export function preloadOnHover(routePath: string) {
  const routeMap: Record<string, () => Promise<any>> = {
    '/create': () => import('../pages/Create'),
    '/templates': () => import('../pages/Templates'),
    '/pricing': () => import('../pages/Pricing'),
    '/playground': () => import('../pages/Playground'),
    '/video-studio': () => import('../pages/VideoStudio'),
  };

  const importFn = routeMap[routePath];
  if (importFn) {
    importFn().catch(() => {
      // Ignore prefetch errors
    });
  }
}
