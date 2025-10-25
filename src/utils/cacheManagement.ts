/**
 * Clear all caches and reload the page
 * Use this for troubleshooting or after major updates
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('✅ Service workers unregistered');
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('✅ All caches cleared');
    }

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Storage cleared');

    // Reload page
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear caches:', error);
    throw error;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  serviceWorkerActive: boolean;
  cacheCount: number;
  totalCachedItems: number;
  cacheNames: string[];
}> {
  const stats = {
    serviceWorkerActive: false,
    cacheCount: 0,
    totalCachedItems: 0,
    cacheNames: [] as string[]
  };

  // Check service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    stats.serviceWorkerActive = registrations.length > 0;
  }

  // Check caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    stats.cacheCount = cacheNames.length;
    stats.cacheNames = cacheNames;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats.totalCachedItems += keys.length;
    }
  }

  return stats;
}

/**
 * Clear only old cache versions (keep current version)
 */
export async function clearOldCaches(currentVersion: string): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  const cachesToDelete = cacheNames.filter(name => !name.includes(currentVersion));

  await Promise.all(
    cachesToDelete.map(name => {
      console.log('Deleting old cache:', name);
      return caches.delete(name);
    })
  );

  console.log(`✅ Cleared ${cachesToDelete.length} old caches`);
}
