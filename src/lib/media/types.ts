/**
 * Media URL Strategy Types
 * Defines explicit strategies for URL generation across content types
 */

export type URLStrategy = 
  | 'public-direct'      // Direct public URL (fastest, no transforms)
  | 'public-cdn'         // Public with CDN transforms (images)
  | 'signed-short'       // Short-lived signed (1hr, security)
  | 'signed-long'        // Long-lived signed (4hrs, streaming)
  | 'proxied-stream';    // Edge function proxy (auth required)

export type MediaContentType = 'image' | 'video' | 'audio';

export type MediaBucket = 
  | 'generated-content'
  | 'template-assets' 
  | 'voice-previews';

export interface BaseMediaOptions {
  strategy?: URLStrategy;
  bucket?: MediaBucket;
}

export interface ImageMediaOptions extends BaseMediaOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  resize?: 'contain' | 'cover' | 'fill';
}

export interface VideoMediaOptions extends BaseMediaOptions {
  preload?: boolean;
  enableProxy?: boolean;
}

export interface AudioMediaOptions extends BaseMediaOptions {
  // Audio-specific options can be added here if needed
  enableProxy?: boolean;
}

export interface MediaContextValue {
  buckets: {
    userContent: MediaBucket;
    templates: MediaBucket;
    voicePreviews: MediaBucket;
  };
}
