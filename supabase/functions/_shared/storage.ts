import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  fileData: Uint8Array,
  fileExtension: string,
  contentType: string
): Promise<string> {
  const timestamp = new Date();
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  
  const folder = `${userId}/${year}-${month}-${day}/${generationId}`;
  const filename = `output.${fileExtension}`;
  const path = `${folder}/${filename}`;

  const mimeType = getMimeType(fileExtension, contentType);

  const { error: uploadError } = await supabase.storage
    .from('generated-content')
    .upload(path, fileData, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    // Error details are included in the thrown error message
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  return path;
}

function getMimeType(extension: string, contentType: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'txt': 'text/plain',
    'json': 'application/json',
    'pdf': 'application/pdf',
  };

  const mime = mimeTypes[extension.toLowerCase()];
  if (mime) return mime;

  // Fallback based on content type
  if (contentType.startsWith('image/')) return 'image/jpeg';
  if (contentType.startsWith('video/')) return 'video/mp4';
  if (contentType.startsWith('audio/')) return 'audio/mpeg';
  
  return 'application/octet-stream';
}
