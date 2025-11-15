import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  fileData: Uint8Array,
  fileExtension: string,
  contentType: string,
  logger?: { info: (msg: string, ctx?: any) => void; error: (msg: string, err: any, ctx?: any) => void }
): Promise<string> {
  // Create folder structure: {user_id}/{YYYY-MM-DD}/{generation_id}.ext
  const date = new Date();
  const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${generationId}.${fileExtension}`;
  const storagePath = `${userId}/${dateFolder}/${fileName}`;
  
  if (logger) {
    logger.info('Starting storage upload', { 
      storagePath, 
      size: fileData.length, 
      userId, 
      generationId,
      fileExtension 
    });
  }

  // Determine MIME type
  const mimeType = getMimeType(fileExtension, contentType);
  
  // Phase 7: Add cache control headers for CDN optimization
  const { error: uploadError } = await supabase.storage
    .from('generated-content')
    .upload(storagePath, fileData, {
      contentType: mimeType,
      cacheControl: '3600', // 1 hour cache
      upsert: false
    });

  if (uploadError) {
    if (logger) {
      logger.error('Storage upload failed', uploadError instanceof Error ? uploadError : new Error(uploadError?.message || 'Upload error'), {
        storagePath,
        userId,
        generationId,
        errorMessage: uploadError.message
      });
    }
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  return storagePath;
}

function getMimeType(extension: string, contentType: string): string {
  const extToMime: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'txt': 'text/plain'
  };

  // Try to determine from extension first
  const mimeFromExt = extToMime[extension.toLowerCase()];
  if (mimeFromExt) return mimeFromExt;

  // Fallback to content type category
  if (contentType === 'image') return 'image/png';
  if (contentType === 'video') return 'video/mp4';
  if (contentType === 'audio') return 'audio/mpeg';
  if (contentType === 'text') return 'text/plain';

  return 'application/octet-stream';
}
