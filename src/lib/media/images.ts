/**
 * Image-specific utilities
 * Extracted from supabase-images.ts for modularity
 */

import {
  getOptimizedImageUrl as getSupabaseImageUrl,
  getPublicImageUrl as getSupabasePublicUrl,
  getResponsiveSrcSet as getSupabaseSrcSet,
  getBlurPlaceholder as getSupabaseBlur,
  type ImageTransformOptions,
} from '@/lib/supabase-images';
import { type URLStrategy, type ImageMediaOptions } from './types';
import { MEDIA_CONFIG } from './config';

/**
 * Get image URL based on strategy
 */
export function getImageUrl(
  storagePath: string,
  options: ImageMediaOptions = {}
): string {
  const {
    strategy = MEDIA_CONFIG.defaults.image,
    bucket = 'generated-content',
    width,
    height,
    quality,
    format,
    resize,
  } = options;

  const transformOptions: ImageTransformOptions = {
    width,
    height,
    quality,
    format,
    resize,
  };

  // Route to correct function based on strategy
  switch (strategy) {
    case 'public-direct':
      return getSupabasePublicUrl(storagePath, bucket);
    
    case 'public-cdn':
      return getSupabaseImageUrl(storagePath, transformOptions);
    
    case 'signed-short':
    case 'signed-long':
      // Signed URLs require async operation, handled by hook
      throw new Error('Signed URL strategy requires useImageUrl hook');
    
    default:
      return getSupabaseImageUrl(storagePath, transformOptions);
  }
}

/**
 * Get responsive srcSet for images
 */
export function getResponsiveSrcSet(
  storagePath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920]
): string {
  return getSupabaseSrcSet(storagePath, sizes);
}

/**
 * Get blur placeholder for progressive loading
 */
export function getBlurPlaceholder(storagePath: string): string {
  return getSupabaseBlur(storagePath);
}
