/**
 * Media Configuration & Feature Flags
 * Allows gradual rollout of new architecture
 */

export const MEDIA_CONFIG = {
  // Feature flags for gradual migration
  useSpecializedHooks: true,    // New hooks vs old useSignedUrl
  useProxiedVideos: false,      // Proxied vs direct (start with direct)
  useCDNTransforms: true,       // Image transforms
  enableVideoPreload: true,     // Smart preloading
  
  // Default strategies per content type
  defaults: {
    image: 'public-cdn' as const,
    video: 'public-direct' as const,
    audio: 'signed-short' as const,  // Voice previews require signed URLs
  },
  
  // Cache settings
  cache: {
    signedUrlTTL: 3600,         // 1 hour
    longSignedUrlTTL: 14400,    // 4 hours
  },
} as const;
