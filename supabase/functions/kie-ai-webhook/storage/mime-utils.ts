/**
 * MIME type utilities for file handling
 */

export function getMimeType(extension: string, contentType: string): string {
  const extToMime: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    // Text/Data
    'txt': 'text/plain',
    'json': 'application/json'
  };

  const mimeFromExt = extToMime[extension.toLowerCase()];
  if (mimeFromExt) return mimeFromExt;

  if (contentType === 'image') return 'image/png';
  if (contentType === 'video') return 'video/mp4';
  if (contentType === 'audio') return 'audio/mpeg';
  if (contentType === 'text') return 'application/json';

  return 'application/octet-stream';
}

/**
 * Determine file extension from MIME type, URL, or generation type
 * @param mimeType - The MIME type from content-type header
 * @param url - The source URL (may contain extension)
 * @param generationType - The generation type (image, audio, video) for fallback
 */
export function determineFileExtension(
  mimeType: string,
  url: string,
  generationType?: string
): string {
  // Try to extract from URL first
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }

  // MIME type to extension mapping
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "text/plain": "txt",
  };

  const extension = mimeToExt[mimeType.toLowerCase()];
  if (extension) return extension;

  // Audio-specific fallback: MP3 is the universal standard
  // Suno and other audio providers use streaming URLs without extensions
  if (generationType === "audio" || mimeType.startsWith("audio/")) {
    return "mp3";
  }

  // Fail fast: Don't guess file extensions for unknown MIME types
  throw new Error(
    `Cannot determine file extension for unknown MIME type: "${mimeType}". ` +
      `URL provided: "${url || "none"}". ` +
      `Generation type: "${generationType || "unknown"}". ` +
      `Supported types: ${Object.keys(mimeToExt).join(", ")}`
  );
}
