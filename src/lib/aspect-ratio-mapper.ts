/**
 * Aspect Ratio Mapper
 * Maps storyboard aspect ratios to model-specific parameter formats
 */

import { logger } from '@/lib/logger';

// Map storyboard aspect ratio codes to actual ratios
const ASPECT_RATIO_MAP: Record<string, string> = {
  'sd': '4:3',          // 640×480
  'hd': '16:9',         // 1280×720
  'full-hd': '16:9',    // 1920×1080 (same ratio as HD)
  'squared': '1:1',     // 1080×1080
  'instagram-story': '9:16',  // 1080×1920
  'instagram-feed': '4:5',    // 1080×1350
};

// Map ratios to Seedream's image_size format
const SEEDREAM_SIZE_MAP: Record<string, string> = {
  '16:9': 'landscape_16_9',
  '1:1': 'square',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '4:5': 'portrait_4_5',
  '3:2': 'landscape_3_2',
  '2:3': 'portrait_2_3',
};

// Map ratios to pixel dimensions (all multiples of 16 for Runware compatibility)
const DIMENSIONS_MAP: Record<string, { width: number; height: number }> = {
  '4:3': { width: 1024, height: 768 },
  '16:9': { width: 1152, height: 640 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 640, height: 1152 },
  '4:5': { width: 896, height: 1120 },
  '3:2': { width: 1152, height: 768 },
  '2:3': { width: 768, height: 1152 },
  '3:4': { width: 768, height: 1024 },
  '21:9': { width: 1536, height: 640 },
};

// Fallback mapping for unsupported aspect ratios
const ASPECT_RATIO_FALLBACKS: Record<string, string> = {
  '4:5': '3:4',   // Instagram Feed → closest portrait
  '5:4': '4:3',   // → closest landscape
};

/**
 * Maps storyboard aspect ratio to model-specific parameters
 * Auto-detects the format from model's input_schema
 */
export function mapAspectRatioToModelParameters(
  storyboardAspectRatio: string | null | undefined,
  modelInputSchema: Record<string, unknown>
): Record<string, unknown> {
  // If no aspect ratio provided, return empty
  if (!storyboardAspectRatio) {
    logger.debug('No aspect ratio provided for mapping', {
      utility: 'aspect-ratio-mapper',
      operation: 'mapAspectRatioToModelParameters'
    });
    return {};
  }

  // Get the actual ratio (e.g., "16:9") from storyboard code (e.g., "hd")
  const actualRatio = ASPECT_RATIO_MAP[storyboardAspectRatio];
  if (!actualRatio) {
    logger.warn('Unknown aspect ratio mapping', {
      utility: 'aspect-ratio-mapper',
      storyboardAspectRatio,
      availableRatios: Object.keys(ASPECT_RATIO_MAP),
      operation: 'mapAspectRatioToModelParameters'
    });
    return {};
  }

  logger.debug('Mapping aspect ratio', {
    utility: 'aspect-ratio-mapper',
    storyboardAspectRatio,
    actualRatio,
    operation: 'mapAspectRatioToModelParameters'
  });

  // Get schema properties
  const properties = (modelInputSchema?.properties || {}) as Record<string, { type?: string }>;

  // Check for aspectRatio parameter (Midjourney, FLUX, etc.)
  if (properties.aspectRatio || properties.aspect_ratio) {
    const aspectProp = (properties.aspectRatio || properties.aspect_ratio) as { enum?: string[] };
    let finalRatio = actualRatio;
    
    // Check if model has enum restrictions
    if (aspectProp.enum && Array.isArray(aspectProp.enum)) {
      if (!aspectProp.enum.includes(actualRatio)) {
        // Use fallback if available
        const fallback = ASPECT_RATIO_FALLBACKS[actualRatio];
        if (fallback && aspectProp.enum.includes(fallback)) {
          logger.warn('Aspect ratio not supported, using fallback', {
            utility: 'aspect-ratio-mapper',
            requestedRatio: actualRatio,
            fallbackRatio: fallback,
            supportedRatios: aspectProp.enum,
            operation: 'mapAspectRatioToModelParameters'
          });
          finalRatio = fallback;
        } else {
          // Default to 16:9 or first supported ratio
          finalRatio = aspectProp.enum.includes('16:9') ? '16:9' : aspectProp.enum[0];
          logger.warn('Aspect ratio not supported, defaulting', {
            utility: 'aspect-ratio-mapper',
            requestedRatio: actualRatio,
            defaultRatio: finalRatio,
            supportedRatios: aspectProp.enum,
            operation: 'mapAspectRatioToModelParameters'
          });
        }
      }
    }
    
    logger.debug('Using aspectRatio parameter', {
      utility: 'aspect-ratio-mapper',
      actualRatio,
      finalRatio,
      parameterType: 'aspectRatio',
      operation: 'mapAspectRatioToModelParameters'
    });
    return { 
      aspectRatio: finalRatio,
      aspect_ratio: finalRatio
    };
  }

  // Check for image_size parameter (Seedream)
  if (properties.image_size) {
    const seedreamSize = SEEDREAM_SIZE_MAP[actualRatio] || 'landscape_16_9';
    logger.debug('Using image_size parameter', {
      utility: 'aspect-ratio-mapper',
      actualRatio,
      seedreamSize,
      parameterType: 'image_size',
      operation: 'mapAspectRatioToModelParameters'
    });
    return { image_size: seedreamSize };
  }

  // Check for width/height parameters (Runware, legacy models)
  if (properties.width && properties.height) {
    const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
    logger.debug('Using width/height parameters', {
      utility: 'aspect-ratio-mapper',
      actualRatio,
      dimensions,
      parameterType: 'width_height',
      operation: 'mapAspectRatioToModelParameters'
    });
    return dimensions;
  }

  // Check for size parameter (some models use single size param)
  if (properties.size) {
    const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
    const sizeString = `${dimensions.width}x${dimensions.height}`;
    logger.debug('Using size parameter', {
      utility: 'aspect-ratio-mapper',
      actualRatio,
      sizeString,
      parameterType: 'size',
      operation: 'mapAspectRatioToModelParameters'
    });
    return { size: sizeString };
  }

  // Fallback to dimensions if no recognized parameter
  const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
  logger.debug('Using dimensions fallback', {
    utility: 'aspect-ratio-mapper',
    actualRatio,
    dimensions,
    reason: 'no_recognized_parameter',
    operation: 'mapAspectRatioToModelParameters'
  });
  return dimensions;
}

/**
 * Get dimensions for display purposes (not for API)
 */
export function getAspectRatioDimensions(storyboardAspectRatio: string | null | undefined): { width: number; height: number } {
  if (!storyboardAspectRatio) {
    return { width: 1920, height: 1080 };
  }

  const actualRatio = ASPECT_RATIO_MAP[storyboardAspectRatio];
  return DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
}
