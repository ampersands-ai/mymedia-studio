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
      console.log('[Cache] Service workers unregistered');

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('[Cache] All caches deleted');

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      console.log('[Cache] Local/session storage cleared');

      console.log('✅ All caches cleared successfully');
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('[Cache] Failed to clear caches:', error);
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
        console.log('[Cache] Deleting old cache:', name);
        return caches.delete(name);
      })
    );
    
    console.log(`[Cache] Cleared ${oldCaches.length} old cache(s)`);
  }
}
