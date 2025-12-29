/**
 * Image processing utilities for generate-content
 * Handles base64 image uploads and conversion to signed URLs
 * 
 * Supports:
 * - Direct base64 strings
 * - Arrays of base64 strings
 * - Nested objects with image fields (e.g., { inputImage: "data:..." })
 * - Arrays of objects with image fields (e.g., [{ inputImage: "data:..." }])
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Logger interface for optional logging
interface Logger {
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn?: (msg: string, ctx?: Record<string, unknown>) => void;
}

// Maximum recursion depth to prevent stack overflow
const MAX_RECURSION_DEPTH = 5;

/**
 * Check if a value is a base64 data URL image
 */
export function isBase64Image(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

/**
 * Check if a value is an HTTP/HTTPS URL
 */
export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

/**
 * Upload a base64 image to Supabase Storage and return signed URL
 */
export async function uploadBase64Image(
  dataUrl: string,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<string> {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  
  // Determine file extension from content type
  const extension = contentType.split('/')[1] || 'jpg';
  const fileName = `input-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const filePath = `${userId}/${fileName}`;
  
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Upload to storage
  const { error: uploadError } = await supabaseClient.storage
    .from('generated-content')
    .upload(filePath, bytes, {
      contentType,
      upsert: false
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }
  
  // Generate signed URL (24 hour expiry)
  const { data: urlData, error: urlError } = await supabaseClient.storage
    .from('generated-content')
    .createSignedUrl(filePath, 86400);
  
  if (urlError || !urlData?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
  }
  
  return urlData.signedUrl;
}

/**
 * Recursively process a value, converting any base64 images to signed URLs
 * 
 * Handles:
 * - Direct base64 strings → signed URL
 * - Arrays of base64 strings → array of signed URLs
 * - Objects with image fields → object with signed URLs
 * - Arrays of objects → arrays of processed objects
 * - Nested structures up to MAX_RECURSION_DEPTH
 */
async function processValue(
  value: unknown,
  userId: string,
  supabaseClient: SupabaseClient,
  logger: Logger | undefined,
  depth: number,
  path: string
): Promise<{ value: unknown; converted: number }> {
  // Prevent infinite recursion
  if (depth > MAX_RECURSION_DEPTH) {
    logger?.warn?.(`Max recursion depth reached at path: ${path}`);
    return { value, converted: 0 };
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return { value, converted: 0 };
  }

  // Handle direct base64 image string
  if (isBase64Image(value)) {
    try {
      const url = await uploadBase64Image(value, userId, supabaseClient);
      logger?.info('Image converted to URL', { metadata: { path, userId } });
      return { value: url, converted: 1 };
    } catch (error) {
      throw new Error(`Failed to process image at '${path}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Handle non-image strings (pass through)
  if (typeof value === 'string') {
    return { value, converted: 0 };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const processedArray: unknown[] = [];
    let totalConverted = 0;

    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const itemPath = `${path}[${i}]`;
      const result = await processValue(item, userId, supabaseClient, logger, depth + 1, itemPath);
      processedArray.push(result.value);
      totalConverted += result.converted;
    }

    return { value: processedArray, converted: totalConverted };
  }

  // Handle objects (but not null, arrays already handled above)
  if (typeof value === 'object') {
    const processedObject: Record<string, unknown> = {};
    let totalConverted = 0;

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const keyPath = path ? `${path}.${key}` : key;
      const result = await processValue(val, userId, supabaseClient, logger, depth + 1, keyPath);
      processedObject[key] = result.value;
      totalConverted += result.converted;
    }

    return { value: processedObject, converted: totalConverted };
  }

  // Primitives (numbers, booleans, etc.) - pass through
  return { value, converted: 0 };
}

/**
 * Convert all base64 images in parameters to signed URLs
 * 
 * This is the main entry point for image processing.
 * It recursively processes the entire parameters object,
 * converting any base64 image data URLs to signed storage URLs.
 * 
 * @param parameters - The parameters object to process
 * @param userId - The user ID for storage path organization
 * @param supabaseClient - Supabase client for storage operations
 * @param logger - Optional logger for debugging
 * @returns Processed parameters with images converted to URLs
 */
export async function convertImagesToUrls(
  parameters: Record<string, unknown>,
  userId: string,
  supabaseClient: SupabaseClient,
  logger?: Logger
): Promise<Record<string, unknown>> {
  const result = await processValue(parameters, userId, supabaseClient, logger, 0, '');
  
  if (result.converted > 0) {
    logger?.info('Images processed', { 
      metadata: { converted_count: result.converted } 
    });
  }
  
  return result.value as Record<string, unknown>;
}
