/**
 * Content upload to Supabase Storage
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getMimeType } from "./mime-utils.ts";

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
    
    console.log('📤 Uploading to storage:', storagePath, 'Size:', fileData.length);

    // Determine MIME type
    const mimeType = getMimeType(fileExtension, contentType);
    console.log('📄 MIME type:', mimeType);
    
    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(storagePath, fileData, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
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
    console.log('✅ Storage upload successful:', storagePath);
    
    return {
      success: true,
      storagePath,
      publicUrl: publicUrl || undefined
    };
  } catch (error: any) {
    console.error('❌ Upload failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown upload error'
    };
  }
}
