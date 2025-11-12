import { logger } from '@/lib/logger';

/**
 * Cache Management Utilities
 * Manual cache clearing for admin/troubleshooting
 */

export async function clearAllCaches() {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      logger.info('Service workers unregistered', {
        component: 'cacheManagement',
        operation: 'clearAllCaches',
        count: registrations.length
      });

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      logger.info('All caches deleted', {
        component: 'cacheManagement',
        operation: 'clearAllCaches',
        cacheCount: cacheNames.length
      });

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      logger.info('Local/session storage cleared', {
        component: 'cacheManagement',
        operation: 'clearAllCaches'
      });

      logger.info('All caches cleared successfully', {
        component: 'cacheManagement',
        operation: 'clearAllCaches'
      });
      
      // Reload page
      window.location.reload();
    } catch (error) {
      logger.error('Failed to clear caches', error as Error, {
        component: 'cacheManagement',
        operation: 'clearAllCaches'
      });
    }
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  if (!('caches' in window)) {
    return {
      serviceWorkerActive: false,
      cacheCount: 0,
      totalCachedItems: 0,
      cacheNames: []
    };
  }

  const cacheNames = await caches.keys();
  let totalCachedItems = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    totalCachedItems += keys.length;
  }

  const serviceWorkerActive = !!(
    'serviceWorker' in navigator && 
    navigator.serviceWorker.controller
  );

  return {
    serviceWorkerActive,
    cacheCount: cacheNames.length,
    totalCachedItems,
    cacheNames
  };
}

/**
 * Clear old cache versions
 */
export async function clearOldCaches(currentVersion: string) {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => !name.includes(currentVersion));
    
    await Promise.all(
      oldCaches.map(name => {
        logger.debug('Deleting old cache', {
          component: 'cacheManagement',
          operation: 'clearOldCaches',
          cacheName: name
        });
        return caches.delete(name);
      })
    );
    
    logger.info('Cleared old caches', {
      component: 'cacheManagement',
      operation: 'clearOldCaches',
      count: oldCaches.length
    });
  }
}
