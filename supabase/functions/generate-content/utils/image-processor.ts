/**
 * Image processing utilities for generate-content
 * Handles base64 image uploads and conversion to signed URLs
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * Convert all base64 images in parameters to signed URLs
 */
export async function convertImagesToUrls(
  parameters: Record<string, any>,
  userId: string,
  supabaseClient: SupabaseClient,
  logger?: { info: (msg: string, ctx?: any) => void }
): Promise<Record<string, any>> {
  const processed = { ...parameters };
  let convertedCount = 0;
  
  for (const [key, value] of Object.entries(parameters)) {
    // Handle single image string
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        processed[key] = await uploadBase64Image(value, userId, supabaseClient);
        convertedCount++;
        if (logger) {
          logger.info('Image converted to URL', { 
            metadata: { field: key, userId } 
          });
        }
      } catch (error) {
        throw new Error(`Failed to process image for '${key}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Handle array of images
    else if (Array.isArray(value)) {
      const processedArray = [];
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          try {
            const url = await uploadBase64Image(item, userId, supabaseClient);
            processedArray.push(url);
            convertedCount++;
          } catch (error) {
            throw new Error(`Failed to process image in array '${key}': ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          processedArray.push(item);
        }
      }
      processed[key] = processedArray;
    }
  }
  
  if (convertedCount > 0 && logger) {
    logger.info('Images processed', { 
      metadata: { converted_count: convertedCount } 
    });
  }
  
  return processed;
}
