/**
 * Service Worker Cleanup Utilities
 * Ensures complete removal of service workers and caches on app load
 */

/**
 * Unregisters all service workers and clears caches
 * Performs a one-time reload if service worker was previously active
 */
export const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Track if any service workers were unregistered
      let hadServiceWorker = registrations.length > 0;
      
      for (const registration of registrations) {
        const unregistered = await registration.unregister();
        if (unregistered) {
          console.log('[Cleanup] Service worker unregistered:', registration.scope);
        }
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('[Cleanup] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }
      
      console.log('[Cleanup] All service workers and caches removed');
      
      // One-time reload if we had a service worker active
      // Use sessionStorage to prevent infinite loops
      if (hadServiceWorker && !sessionStorage.getItem('sw_cleanup_complete')) {
        sessionStorage.setItem('sw_cleanup_complete', '1');
        console.log('[Cleanup] Reloading page once to complete cleanup...');
        window.location.reload();
      }
    } catch (error) {
      console.error('[Cleanup] Error removing service workers:', error);
    }
  }
};

/**
 * Check if service workers are completely removed
 */
export const verifyServiceWorkerRemoval = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      console.warn('[Cleanup] Service workers still present:', registrations);
      return false;
    }
    console.log('[Cleanup] ✅ No service workers detected');
    return true;
  }
  return true;
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  let cacheCount = 0;
  let cachedItems = 0;
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    cacheCount = cacheNames.length;
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      cachedItems += keys.length;
    }
  }
  
  return { cacheCount, cachedItems };
};
