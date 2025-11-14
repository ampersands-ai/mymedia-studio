/**
 * Image Upload Helpers
 * Handles base64 image conversion and signed URL generation
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Upload a base64 image and return signed URL
 */
export async function uploadBase64Image(
  dataUrl: string,
  userId: string,
  supabaseClient: SupabaseClient,
  logger?: { info: (msg: string, ctx?: any) => void; error: (msg: string, err: any, ctx?: any) => void }
): Promise<string> {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  
  const extension = contentType.split('/')[1] || 'jpg';
  const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const filePath = `${userId}/${fileName}`;
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const { error: uploadError } = await supabaseClient.storage
    .from('generated-content')
    .upload(filePath, bytes, {
      contentType,
      upsert: false
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }
  
  const { data: urlData, error: urlError } = await supabaseClient.storage
    .from('generated-content')
    .createSignedUrl(filePath, 86400);
  
  if (urlError || !urlData?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
  }
  
  return urlData.signedUrl;
}

/**
 * Process image uploads in user inputs and generate signed URLs
 */
export async function processImageUploads(
  inputs: Record<string, any>,
  userId: string,
  supabaseClient: SupabaseClient,
  logger?: { info: (msg: string, ctx?: any) => void; error: (msg: string, err: any, ctx?: any) => void }
): Promise<Record<string, any>> {
  const processed = { ...inputs };
  
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        if (logger) {
          logger.info('Processing image upload', { field: key, userId });
        }
        processed[key] = await uploadBase64Image(value, userId, supabaseClient, logger);
        if (logger) {
          logger.info('Signed URL generated', { field: key, userId });
        }
      } catch (error) {
        if (logger) {
          logger.error('Image processing failed', error as Error, { field: key, userId });
        }
        throw error;
      }
    }
    else if (Array.isArray(value)) {
      const processedArray = [];
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          const temp = await processImageUploads({ temp: item }, userId, supabaseClient, logger);
          processedArray.push(temp.temp);
        } else {
          processedArray.push(item);
        }
      }
      processed[key] = processedArray;
    }
  }
  
  return processed;
}

/**
 * Sanitize parameters and convert base64 images to signed URLs
 */
export async function sanitizeParametersForProviders(
  params: Record<string, any>,
  userId: string,
  supabaseClient: SupabaseClient,
  logger?: { info: (msg: string, ctx?: any) => void; error: (msg: string, err: any, ctx?: any) => void }
): Promise<Record<string, any>> {
  const mediaKeys = ['image_url', 'image_urls', 'input_image', 'reference_image', 'mask_image', 'image', 'images', 'thumbnail', 'cover'];
  const processed = { ...params };
  let convertedCount = 0;
  
  for (const [key, value] of Object.entries(params)) {
    const isMediaKey = mediaKeys.includes(key.toLowerCase());
    
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        const signedUrl = await uploadBase64Image(value, userId, supabaseClient, logger);
        processed[key] = signedUrl;
        convertedCount++;
      } catch (error) {
        if (logger) {
          logger.error('Image processing failed', error as Error, { field: key, userId });
        }
        throw error;
      }
    }
    else if (Array.isArray(value) && isMediaKey) {
      const processedArray = [];
      for (const item of value) {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          try {
            const signedUrl = await uploadBase64Image(item, userId, supabaseClient, logger);
            processedArray.push(signedUrl);
            convertedCount++;
          } catch (error) {
            if (logger) {
              logger.error('Array image processing failed', error as Error, { field: key, userId });
            }
            throw error;
          }
        } else if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
          processedArray.push(item);
        } else {
          processedArray.push(item);
        }
      }
      processed[key] = processedArray;
    }
  }
  
  if (convertedCount > 0 && logger) {
    logger.info('Image sanitization complete', { convertedCount, userId });
  }
  
  return processed;
}
