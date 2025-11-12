import { config } from '@/config';

/**
 * Centralized React Query cache configuration
 * Provides consistent caching strategies across the application
 */
export const queryCacheConfig = config.cache;

/**
 * Request deduplication cache for preventing duplicate API calls
 */
const requestCache = new Map<string, Promise<any>>();

/**
 * Execute a request with automatic deduplication
 * If the same request is already in flight, returns the existing promise
 * 
 * @param key - Unique key for the request
 * @param fn - Function that performs the request
 * @param ttl - Time to live for cache in milliseconds
 * @returns Result of the request
 * 
 * @example
 * ```typescript
 * const data = await cachedRequest(
 *   'user-profile',
 *   () => fetchUserProfile(),
 *   5000
 * );
 * ```
 */
export async function cachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> {
  // Return existing promise if request is in flight
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }

  // Execute request and cache the promise
  const promise = fn().finally(() => {
    // Remove from cache after TTL
    setTimeout(() => requestCache.delete(key), ttl);
  });

  requestCache.set(key, promise);
  return promise;
}

/**
 * Clear the request cache
 */
export function clearRequestCache(): void {
  requestCache.clear();
}

/**
 * Clear specific cached request
 */
export function clearCachedRequest(key: string): void {
  requestCache.delete(key);
}
