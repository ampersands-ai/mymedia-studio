/**
 * Content upload to Supabase Storage
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMimeType } from "./mime-utils.ts";
import { webhookLogger } from "../../_shared/logger.ts";

export interface UploadResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

export async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  fileData: Uint8Array,
  fileExtension: string,
  contentType: string
): Promise<UploadResult> {
  try {
    // Create folder structure: {user_id}/{YYYY-MM-DD}/{generation_id}.ext
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${generationId}.${fileExtension}`;
    const storagePath = `${userId}/${dateFolder}/${fileName}`;
    
    const mimeType = getMimeType(fileExtension, contentType);
    
    webhookLogger.info('Starting storage upload', {
      storagePath,
      size: fileData.length,
      mimeType,
      generationId,
      userId
    });
    
    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(storagePath, fileData, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      webhookLogger.upload(storagePath, false, {
        error: uploadError.message,
        generationId,
        userId
      });
      return {
        success: false,
        error: uploadError.message || 'Storage upload failed'
      };
    }

    // Generate public URL
    const { data: urlData } = await supabase
      .storage
      .from('generated-content')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl || null;
    
    webhookLogger.upload(storagePath, true, {
      publicUrl,
      size: fileData.length,
      generationId,
      userId
    });
    
    return {
      success: true,
      storagePath,
      publicUrl: publicUrl || undefined
    };
  } catch (error: any) {
    webhookLogger.upload('unknown', false, {
      error: error.message || 'Unknown upload error',
      generationId,
      userId
    });
    return {
      success: false,
      error: error.message || 'Unknown upload error'
    };
  }
}
