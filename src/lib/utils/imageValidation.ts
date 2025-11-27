/**
 * Image Validation Utility
 *
 * Provides reusable image-specific validation functions including dimension checks.
 * Extracted from duplicate implementations across image upload components.
 *
 * @module imageValidation
 */

/**
 * Image validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Image dimension constraints
 */
export interface DimensionConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Exact width (if provided, overrides min/max) */
  exactWidth?: number;
  /** Exact height (if provided, overrides min/max) */
  exactHeight?: number;
  /** Allowed aspect ratios (e.g., ['16:9', '4:3', '1:1']) */
  aspectRatios?: string[];
  /** Aspect ratio tolerance (default: 0.01) */
  aspectRatioTolerance?: number;
}

/**
 * Common aspect ratios
 */
export const ASPECT_RATIOS = {
  SQUARE: '1:1',
  PORTRAIT: '9:16',
  LANDSCAPE: '16:9',
  WIDE: '21:9',
  CLASSIC: '4:3',
  PHOTO: '3:2',
} as const;

/**
 * Common image dimension presets
 */
export const IMAGE_DIMENSIONS = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 640, height: 480 },
  MEDIUM: { width: 1280, height: 720 },
  LARGE: { width: 1920, height: 1080 },
  HD: { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
  INSTAGRAM_SQUARE: { width: 1080, height: 1080 },
  INSTAGRAM_PORTRAIT: { width: 1080, height: 1350 },
  INSTAGRAM_LANDSCAPE: { width: 1080, height: 566 },
  FACEBOOK_COVER: { width: 820, height: 312 },
  TWITTER_HEADER: { width: 1500, height: 500 },
} as const;

/**
 * Load image from File or URL
 *
 * @param source - File object or image URL
 * @returns Promise resolving to HTMLImageElement
 *
 * @example
 * ```typescript
 * const img = await loadImage(file);
 * console.log(`Dimensions: ${img.width}x${img.height}`);
 * ```
 */
export function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get image dimensions from File
 *
 * @param file - Image file
 * @returns Promise resolving to dimensions
 *
 * @example
 * ```typescript
 * const { width, height } = await getImageDimensions(file);
 * ```
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return {
    width: img.width,
    height: img.height,
  };
}

/**
 * Validate image dimensions
 *
 * @param file - Image file to validate
 * @param constraints - Dimension constraints
 * @returns Promise resolving to validation result
 *
 * @example
 * ```typescript
 * const result = await validateImageDimensions(file, {
 *   minWidth: 1024,
 *   minHeight: 768,
 *   maxWidth: 4096,
 *   maxHeight: 4096
 * });
 *
 * if (!result.valid) {
 *   toast.error(result.error);
 * }
 * ```
 */
export async function validateImageDimensions(
  file: File,
  constraints: DimensionConstraints
): Promise<ImageValidationResult> {
  try {
    const img = await loadImage(file);
    const { width, height } = img;

    // Clean up object URL
    URL.revokeObjectURL(img.src);

    // Check exact dimensions
    if (constraints.exactWidth !== undefined && width !== constraints.exactWidth) {
      return {
        valid: false,
        error: `Image width must be exactly ${constraints.exactWidth}px (got ${width}px)`,
        dimensions: { width, height },
      };
    }

    if (constraints.exactHeight !== undefined && height !== constraints.exactHeight) {
      return {
        valid: false,
        error: `Image height must be exactly ${constraints.exactHeight}px (got ${height}px)`,
        dimensions: { width, height },
      };
    }

    // Check minimum dimensions
    if (constraints.minWidth !== undefined && width < constraints.minWidth) {
      return {
        valid: false,
        error: `Image width must be at least ${constraints.minWidth}px (got ${width}px)`,
        dimensions: { width, height },
      };
    }

    if (constraints.minHeight !== undefined && height < constraints.minHeight) {
      return {
        valid: false,
        error: `Image height must be at least ${constraints.minHeight}px (got ${height}px)`,
        dimensions: { width, height },
      };
    }

    // Check maximum dimensions
    if (constraints.maxWidth !== undefined && width > constraints.maxWidth) {
      return {
        valid: false,
        error: `Image width must be at most ${constraints.maxWidth}px (got ${width}px)`,
        dimensions: { width, height },
      };
    }

    if (constraints.maxHeight !== undefined && height > constraints.maxHeight) {
      return {
        valid: false,
        error: `Image height must be at most ${constraints.maxHeight}px (got ${height}px)`,
        dimensions: { width, height },
      };
    }

    // Check aspect ratios
    if (constraints.aspectRatios && constraints.aspectRatios.length > 0) {
      const imageRatio = width / height;
      const tolerance = constraints.aspectRatioTolerance ?? 0.01;
      const isValidRatio = constraints.aspectRatios.some(ratio => {
        const [w, h] = ratio.split(':').map(Number);
        const targetRatio = w / h;
        return Math.abs(imageRatio - targetRatio) <= tolerance;
      });

      if (!isValidRatio) {
        return {
          valid: false,
          error: `Image aspect ratio must be one of: ${constraints.aspectRatios.join(', ')}`,
          dimensions: { width, height },
        };
      }
    }

    return {
      valid: true,
      dimensions: { width, height },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate image',
    };
  }
}

/**
 * Calculate aspect ratio from dimensions
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Aspect ratio as string (e.g., "16:9")
 *
 * @example
 * ```typescript
 * calculateAspectRatio(1920, 1080) // "16:9"
 * calculateAspectRatio(1080, 1080) // "1:1"
 * ```
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/**
 * Parse aspect ratio string to decimal
 *
 * @param ratio - Aspect ratio string (e.g., "16:9")
 * @returns Decimal representation
 *
 * @example
 * ```typescript
 * parseAspectRatio('16:9') // 1.777...
 * parseAspectRatio('1:1') // 1
 * ```
 */
export function parseAspectRatio(ratio: string): number {
  const [width, height] = ratio.split(':').map(Number);
  if (!width || !height) {
    throw new Error(`Invalid aspect ratio: ${ratio}`);
  }
  return width / height;
}

/**
 * Check if image matches aspect ratio
 *
 * @param width - Image width
 * @param height - Image height
 * @param targetRatio - Target aspect ratio (e.g., "16:9")
 * @param tolerance - Allowed tolerance (default: 0.01)
 * @returns True if aspect ratio matches
 *
 * @example
 * ```typescript
 * matchesAspectRatio(1920, 1080, '16:9') // true
 * matchesAspectRatio(1920, 1200, '16:9') // false
 * ```
 */
export function matchesAspectRatio(
  width: number,
  height: number,
  targetRatio: string,
  tolerance: number = 0.01
): boolean {
  const imageRatio = width / height;
  const target = parseAspectRatio(targetRatio);
  return Math.abs(imageRatio - target) <= tolerance;
}

/**
 * Validate image is square
 *
 * @param file - Image file
 * @param tolerance - Allowed tolerance in pixels (default: 0)
 * @returns Promise resolving to validation result
 */
export async function validateSquareImage(
  file: File,
  tolerance: number = 0
): Promise<ImageValidationResult> {
  const result = await validateImageDimensions(file, {
    aspectRatios: [ASPECT_RATIOS.SQUARE],
    aspectRatioTolerance: tolerance / 100, // Convert px to ratio
  });

  if (!result.valid) {
    return {
      ...result,
      error: 'Image must be square (1:1 aspect ratio)',
    };
  }

  return result;
}

/**
 * Get optimal dimensions for target aspect ratio
 *
 * Calculates dimensions that maintain aspect ratio while fitting within max size
 *
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetRatio - Target aspect ratio (e.g., "16:9")
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Optimal dimensions
 *
 * @example
 * ```typescript
 * const dims = getOptimalDimensions(2000, 1500, '16:9', 1920, 1080);
 * // Returns dimensions that fit 16:9 within 1920x1080
 * ```
 */
export function getOptimalDimensions(
  _originalWidth: number,
  _originalHeight: number,
  targetRatio: string,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = parseAspectRatio(targetRatio);

  // Try fitting to width
  let width = maxWidth;
  let height = Math.round(width / ratio);

  // If height exceeds max, fit to height instead
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * ratio);
  }

  return { width, height };
}

/**
 * Create image from canvas
 *
 * @param canvas - Canvas element
 * @param type - Image MIME type (default: 'image/png')
 * @param quality - Image quality 0-1 (default: 0.92)
 * @returns Promise resolving to Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Resize image to fit within dimensions
 *
 * @param file - Image file
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @param quality - Image quality 0-1 (default: 0.92)
 * @returns Promise resolving to resized File
 *
 * @example
 * ```typescript
 * const resized = await resizeImage(file, 1920, 1080);
 * ```
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.92
): Promise<File> {
  const img = await loadImage(file);
  const { width, height } = img;

  // Calculate new dimensions
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Convert to blob
  const blob = await canvasToBlob(canvas, file.type, quality);

  // Clean up
  URL.revokeObjectURL(img.src);

  // Create new file
  return new File([blob], file.name, {
    type: file.type,
    lastModified: Date.now(),
  });
}

/**
 * Check if file is a valid image
 *
 * @param file - File to check
 * @returns Promise resolving to true if valid image
 */
export async function isValidImage(file: File): Promise<boolean> {
  try {
    await loadImage(file);
    return true;
  } catch {
    return false;
  }
}
