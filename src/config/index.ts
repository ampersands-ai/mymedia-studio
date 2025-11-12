export const config = {
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  polling: {
    immediate: 1000,
    fast: 5000,
    medium: 10000,
    slow: 20000,
    maxDuration: 20 * 60 * 1000, // 20 minutes
  },
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentGenerations: 3,
    maxRetries: 3,
  },
  cache: {
    generations: { staleTime: 30_000, cacheTime: 5 * 60_000 },
    userProfile: { staleTime: 5 * 60_000, cacheTime: 30 * 60_000 },
    templates: { staleTime: 10 * 60_000, cacheTime: 60 * 60_000 },
    models: { staleTime: 15 * 60_000, cacheTime: 2 * 60 * 60_000 },
  },
  urls: {
    signedUrlExpiry: 60, // seconds
    cacheMargin: 0.8, // Use 80% of expiry time for cache
  },
} as const;
