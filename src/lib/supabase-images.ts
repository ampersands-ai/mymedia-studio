/**
 * Supabase Storage Image Transformation Utilities
 * Docs: https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  resize?: 'contain' | 'cover' | 'fill';
}

/**
 * Generate optimized image URL using Supabase Storage transformations
 */
export function getOptimizedImageUrl(
  bucketPath: string,
  options: ImageTransformOptions = {}
): string {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover',
  } = options;

  // Build transformation URL
  const params = new URLSearchParams();

  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  params.set('quality', quality.toString());
  params.set('format', format);
  params.set('resize', resize);

  // Supabase Storage public URL pattern
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucket = 'generated-content'; // Using generated-content bucket for user creations

  return `${baseUrl}/storage/v1/render/image/${bucket}/${bucketPath}?${params.toString()}`;
}

/**
 * Generate responsive image srcSet for multiple screen sizes
 */
export function getResponsiveSrcSet(
  bucketPath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920]
): string {
  return sizes
    .map((width) => {
      const url = getOptimizedImageUrl(bucketPath, { width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get tiny blur placeholder URL (40px, quality 10)
 * Perfect for progressive loading effect
 */
export function getBlurPlaceholder(bucketPath: string): string {
  return getOptimizedImageUrl(bucketPath, {
    width: 40,
    quality: 10,
  });
}

/**
 * Check if browser supports AVIF format
 */
export function supportsAVIF(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get best supported format for the current browser
 */
export function getBestFormat(): 'avif' | 'webp' | 'jpeg' {
  if (supportsAVIF()) return 'avif';
  if (supportsWebP()) return 'webp';
  return 'jpeg';
}
