/**
 * Storage Service Module
 * Handles file uploads and URL generation for generated content
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { uploadToStorage as baseUploadToStorage } from "../utils/storage.ts";

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
  fileSize?: number;
  uploadDuration: number;
}

/**
 * Upload generation output to storage and get public URL
 */
export async function uploadGenerationOutput(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  outputData: Uint8Array,
  fileExtension: string,
  contentType: string,
  logger: EdgeLogger
): Promise<UploadResult> {
  const uploadStartTime = Date.now();
  
  const storagePath = await baseUploadToStorage(
    supabase,
    userId,
    generationId,
    outputData,
    fileExtension,
    contentType,
    logger
  );

  const uploadDuration = Date.now() - uploadStartTime;

  logger.info('Uploaded to storage', {
    userId,
    metadata: { storage_path: storagePath }
  });

  const { data: { publicUrl } } = supabase.storage
    .from('generated-content')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl,
    fileSize: outputData.length,
    uploadDuration
  };
}

/**
 * Get storage path details for already-uploaded content
 */
export async function getExistingStorageInfo(
  supabase: SupabaseClient,
  storagePath: string,
  userId: string,
  logger: EdgeLogger
): Promise<{ publicUrl: string; fileSize?: number }> {
  logger.info('Content already in storage', {
    userId,
    metadata: { storage_path: storagePath }
  });

  // Get actual file size if available
  let fileSize: number | undefined;
  const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
  const { data: fileData } = await supabase.storage
    .from('generated-content')
    .list(folderPath);
  
  if (fileData && fileData.length > 0) {
    const file = fileData.find(f => f.name === 'output.mp4');
    if (file) {
      fileSize = file.metadata?.size || 0;
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('generated-content')
    .getPublicUrl(storagePath);

  return { publicUrl, fileSize };
}

/**
 * Calculate timing durations for generation completion
 */
export async function calculateTimingData(
  supabase: SupabaseClient,
  generationId: string,
  completedAtMs: number
): Promise<{ setupDurationMs: number | null; apiDurationMs: number | null }> {
  const { data: genData } = await supabase
    .from('generations')
    .select('created_at, api_call_started_at')
    .eq('id', generationId)
    .single();
  
  let setupDurationMs: number | null = null;
  let apiDurationMs: number | null = null;
  
  if (genData) {
    const createdAtMs = new Date(genData.created_at).getTime();
    const apiCallStartedAtMs = genData.api_call_started_at 
      ? new Date(genData.api_call_started_at).getTime() 
      : null;
    
    if (apiCallStartedAtMs) {
      setupDurationMs = apiCallStartedAtMs - createdAtMs;
      apiDurationMs = completedAtMs - apiCallStartedAtMs;
    } else {
      apiDurationMs = completedAtMs - createdAtMs;
    }
  }

  return { setupDurationMs, apiDurationMs };
}
