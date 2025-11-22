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
  } else if (cleanPath.includes('/storage/v1/object/sign/')) {
    const m = cleanPath.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
    if (m) cleanPath = m[1];
  } else if (cleanPath.includes('/storage/v1/render/image/')) {
    // Supports /render/image/{bucket}/path and /render/image/{mode}/{bucket}/path
    const m = cleanPath.match(/\/storage\/v1\/render\/image\/(?:(?:public|sign|authenticated)\/)?[^/]+\/(.+)/);
    if (m) cleanPath = m[1];
  } else if (cleanPath.includes(`/${bucket}/`)) {
    const part = cleanPath.split(`/${bucket}/`)[1];
    if (part) cleanPath = part;
  }

  // Strip legacy /dashboard/{userId}/ prefix pattern if present
  if (cleanPath.includes('/dashboard/')) {
    const dashboardMatch = cleanPath.match(/^\/dashboard\/[^/]+\/(.+)/);
    if (dashboardMatch) {
      cleanPath = dashboardMatch[1];
    }
  }

  // Normalize and decode
  cleanPath = cleanPath.replace(/^\/+/, '');
  try {
    cleanPath = decodeURI(cleanPath);
  } catch {
    // If decoding fails, use the original path
  }

  return cleanPath;
}

/**
 * Infer bucket from a full URL or path. Defaults to generated-content
 */
function inferBucket(bucketPath: string, fallback: string = 'generated-content'): string {
  try {
    const asUrl = new URL(bucketPath);
    const p = asUrl.pathname;
    // render/image with optional mode segment
    let m = p.match(/\/storage\/v1\/render\/image\/(?:(?:public|sign|authenticated)\/)?([^/]+)\//);
    if (m && m[1]) return m[1];
    // object public/sign
    m = p.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\//);
    if (m && m[1]) return m[1];
  } catch {
    // Not a full URL: only treat the first segment as bucket if it's a known bucket
    const cleaned = bucketPath.replace(/^\/+/, '').split('?')[0].split('#')[0];
    const [firstSegment] = cleaned.split('/');

    // Whitelist of known buckets to prevent treating UUIDs/paths as buckets
    const KNOWN_BUCKETS = ['generated-content', 'storyboard-videos', 'faceless-videos', 'voice-previews'];

    if (firstSegment && KNOWN_BUCKETS.includes(firstSegment)) {
      return firstSegment;
    }
  }

  // Default: assume generated-content for plain storage paths
  return fallback;
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

  // Clean the path and detect bucket first
  const bucket = inferBucket(bucketPath, 'generated-content');
  const cleanPath = cleanImagePath(bucketPath, bucket);

  // Temporary debug logging
  console.log('🔧 getOptimizedImageUrl', {
    originalPath: bucketPath.substring(0, 60),
    inferredBucket: bucket,
    cleanPath: cleanPath.substring(0, 60),
  });

  // Build transformation URL
  const params = new URLSearchParams();

  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  params.set('quality', quality.toString());
  params.set('format', format);
  params.set('resize', resize);

  // Supabase Storage public URL pattern
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Determine if original path was a signed URL and preserve token
  let modeSegment = '';
  try {
    const original = new URL(bucketPath);
    const p = original.pathname;
    if (p.includes('/storage/v1/object/sign/') || p.includes('/storage/v1/render/image/sign/')) {
      modeSegment = 'sign/';
      const token = original.searchParams.get('token') || original.searchParams.get('t');
      if (token) params.set('token', token);
    }
  } catch {
    // not a full URL, assume public
  }

  const encodedPath = encodeURI(cleanPath);
  const mode = modeSegment; // '' for public, 'sign/' for private
  return `${baseUrl}/storage/v1/render/image/${mode}${bucket}/${encodedPath}?${params.toString()}`;
}

export function getPublicImageUrl(
  bucketPath: string,
  bucket: string = 'generated-content'
): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const inferred = inferBucket(bucketPath, bucket);
  const cleanPath = cleanImagePath(bucketPath, inferred);
  const encodedPath = encodeURI(cleanPath);
  return `${baseUrl}/storage/v1/object/public/${inferred}/${encodedPath}`;
}

export function getStorageRelativePath(
  bucketPath: string,
  bucket: string = 'generated-content'
): string {
  const inferred = inferBucket(bucketPath, bucket);
  return cleanImagePath(bucketPath, inferred);
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
