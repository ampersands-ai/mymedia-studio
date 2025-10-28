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
 * Clean storage path from full URLs
 */
function cleanImagePath(bucketPath: string, bucket: string = 'generated-content'): string {
  let cleanPath = bucketPath;

  // Strip query strings and hashes first
  try {
    const asUrl = new URL(bucketPath);
    cleanPath = asUrl.pathname; // drop ?query and #hash
  } catch {
    cleanPath = bucketPath.split('?')[0].split('#')[0];
  }

  // Handle various Supabase URL patterns
  if (cleanPath.includes('/storage/v1/object/public/')) {
    const m = cleanPath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (m) cleanPath = m[1];
  } else if (cleanPath.includes('/storage/v1/render/image/')) {
    const m = cleanPath.match(/\/storage\/v1\/render\/image\/[^/]+\/(.+)/);
    if (m) cleanPath = m[1];
  } else if (cleanPath.includes(`/${bucket}/`)) {
    const part = cleanPath.split(`/${bucket}/`)[1];
    if (part) cleanPath = part;
  }

  // Normalize and decode
  cleanPath = cleanPath.replace(/^\/+/, '');
  try {
    cleanPath = decodeURI(cleanPath);
  } catch {}

  return cleanPath;
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

  // Clean the path first
  const cleanPath = cleanImagePath(bucketPath, 'generated-content');

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

  const encodedPath = encodeURI(cleanPath);
  return `${baseUrl}/storage/v1/render/image/${bucket}/${encodedPath}?${params.toString()}`;
}

export function getPublicImageUrl(
  bucketPath: string,
  bucket: string = 'generated-content'
): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const cleanPath = cleanImagePath(bucketPath, bucket);
  const encodedPath = encodeURI(cleanPath);
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function getStorageRelativePath(
  bucketPath: string,
  bucket: string = 'generated-content'
): string {
  return cleanImagePath(bucketPath, bucket);
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
