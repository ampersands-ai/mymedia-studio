/**
 * Aspect Ratio Mapper
 * Maps storyboard aspect ratios to model-specific parameter formats
 */

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

// Map ratios to pixel dimensions
const DIMENSIONS_MAP: Record<string, { width: number; height: number }> = {
  '4:3': { width: 1024, height: 768 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '3:2': { width: 1536, height: 1024 },
  '2:3': { width: 1024, height: 1536 },
};

/**
 * Maps storyboard aspect ratio to model-specific parameters
 * Auto-detects the format from model's input_schema
 */
export function mapAspectRatioToModelParameters(
  storyboardAspectRatio: string | null | undefined,
  modelInputSchema: any
): Record<string, any> {
  // If no aspect ratio provided, return empty
  if (!storyboardAspectRatio) {
    console.log('[AspectRatioMapper] No aspect ratio provided, returning empty params');
    return {};
  }

  // Get the actual ratio (e.g., "16:9") from storyboard code (e.g., "hd")
  const actualRatio = ASPECT_RATIO_MAP[storyboardAspectRatio];
  if (!actualRatio) {
    console.warn(`[AspectRatioMapper] Unknown aspect ratio: ${storyboardAspectRatio}`);
    return {};
  }

  console.log(`[AspectRatioMapper] Mapping ${storyboardAspectRatio} → ${actualRatio}`);

  // Get schema properties
  const properties = modelInputSchema?.properties || {};

  // Check for aspectRatio parameter (Midjourney, FLUX, etc.)
  if (properties.aspectRatio || properties.aspect_ratio) {
    console.log(`[AspectRatioMapper] Using aspectRatio parameter: ${actualRatio}`);
    return { 
      aspectRatio: actualRatio,
      aspect_ratio: actualRatio // Some models use snake_case
    };
  }

  // Check for image_size parameter (Seedream)
  if (properties.image_size) {
    const seedreamSize = SEEDREAM_SIZE_MAP[actualRatio] || 'landscape_16_9';
    console.log(`[AspectRatioMapper] Using image_size parameter: ${seedreamSize}`);
    return { image_size: seedreamSize };
  }

  // Check for width/height parameters (Runware, legacy models)
  if (properties.width && properties.height) {
    const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
    console.log(`[AspectRatioMapper] Using width/height parameters: ${dimensions.width}x${dimensions.height}`);
    return dimensions;
  }

  // Check for size parameter (some models use single size param)
  if (properties.size) {
    const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
    const sizeString = `${dimensions.width}x${dimensions.height}`;
    console.log(`[AspectRatioMapper] Using size parameter: ${sizeString}`);
    return { size: sizeString };
  }

  // Fallback to dimensions if no recognized parameter
  const dimensions = DIMENSIONS_MAP[actualRatio] || { width: 1920, height: 1080 };
  console.log(`[AspectRatioMapper] No recognized aspect ratio parameter in schema, using dimensions fallback: ${dimensions.width}x${dimensions.height}`);
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
