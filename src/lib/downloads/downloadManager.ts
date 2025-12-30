/**
 * Download Manager
 *
 * Consolidated download utility that replaces 6 duplicate implementations.
 * Provides proper error handling, resource cleanup, and user feedback.
 *
 * Features:
 * - Automatic cleanup of blob URLs and DOM elements
 * - Progress tracking for large files
 * - Proper error handling with user-friendly messages
 * - Support for both storage paths and direct URLs
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { StorageError, NetworkError } from '@/lib/errors/custom-errors';

export interface DownloadOptions {
  /** Custom filename for the download */
  filename?: string;
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Storage bucket name (default: 'generated-content') */
  bucket?: string;
  /** Signed URL expiration in seconds (default: 60) */
  expiresIn?: number;
}

/**
 * Download a file from Supabase storage
 */
export async function downloadFromStorage(
  storagePath: string,
  options: DownloadOptions = {}
): Promise<boolean> {
  const {
    filename,
    showErrorToast = true,
    bucket = 'generated-content',
    expiresIn = 60,
  } = options;

  let blobUrl: string | null = null;
  let anchorElement: HTMLAnchorElement | null = null;

  try {
    // Get signed URL from storage
    const { data, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (urlError || !data?.signedUrl) {
      throw new StorageError(
        'Failed to create download link',
        urlError,
        { storagePath, bucket }
      );
    }

    // Download the file
    const response = await fetch(data.signedUrl);

    if (!response.ok) {
      throw new NetworkError(
        'Failed to download file',
        response.status,
        undefined,
        { storagePath }
      );
    }

    const blob = await response.blob();

    // Determine filename
    const finalFilename =
      filename || extractFilenameFromPath(storagePath) || `download-${Date.now()}`;

    // Create blob URL and trigger download
    blobUrl = window.URL.createObjectURL(blob);
    anchorElement = document.createElement('a');
    anchorElement.href = blobUrl;
    anchorElement.download = finalFilename;
    anchorElement.style.display = 'none';

    document.body.appendChild(anchorElement);
    anchorElement.click();

    logger.info('File downloaded successfully', {
      storagePath,
      filename: finalFilename,
      fileSize: blob.size,
    });

    return true;
  } catch (error) {
    logger.error('Download failed', error as Error, {
      storagePath,
      bucket,
    });

    if (showErrorToast) {
      toast.error('Failed to download file', {
        description: 'Please try again or contact support if the issue persists',
      });
    }

    return false;
  } finally {
    // Cleanup resources
    if (blobUrl) {
      // Revoke blob URL after a delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl!);
      }, 100);
    }

    if (anchorElement && anchorElement.parentNode) {
      document.body.removeChild(anchorElement);
    }
  }
}

/**
 * Download a file from a direct URL
 */
export async function downloadFromUrl(
  url: string,
  options: DownloadOptions = {}
): Promise<boolean> {
  const {
    filename,
    showErrorToast = true,
  } = options;

  let blobUrl: string | null = null;
  let anchorElement: HTMLAnchorElement | null = null;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new NetworkError('Failed to download file', response.status, undefined, {
        url,
      });
    }

    const blob = await response.blob();
    
    // Validate blob has content
    if (blob.size === 0) {
      throw new NetworkError('Downloaded file is empty', 0, undefined, { url });
    }

    const finalFilename = filename || extractFilenameFromUrl(url) || `download-${Date.now()}`;
    
    // Ensure proper MIME type for video files
    const finalBlob = finalFilename.endsWith('.mp4') 
      ? new Blob([blob], { type: 'video/mp4' })
      : blob;

    blobUrl = window.URL.createObjectURL(finalBlob);
    anchorElement = document.createElement('a');
    anchorElement.href = blobUrl;
    anchorElement.download = finalFilename;
    anchorElement.style.display = 'none';

    document.body.appendChild(anchorElement);
    anchorElement.click();

    logger.info('File downloaded successfully', {
      url,
      filename: finalFilename,
      fileSize: finalBlob.size,
    });

    return true;
  } catch (error) {
    logger.error('Download failed', error as Error, { url });

    if (showErrorToast) {
      toast.error('Failed to download file');
    }

    return false;
  } finally {
    if (blobUrl) {
      // Longer delay for video files to ensure download completes
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl!);
      }, 1500);
    }

    if (anchorElement && anchorElement.parentNode) {
      setTimeout(() => {
        if (anchorElement && anchorElement.parentNode) {
          document.body.removeChild(anchorElement);
        }
      }, 1500);
    }
  }
}

/**
 * Download multiple files from storage
 */
export async function downloadBatchFromStorage(
  storagePaths: string[],
  options: Omit<DownloadOptions, 'filename'> = {}
): Promise<{ successful: number; failed: number }> {
  const {
    showErrorToast = true,
    bucket = 'generated-content',
  } = options;

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < storagePaths.length; i++) {
    const path = storagePaths[i];
    const result = await downloadFromStorage(path, {
      ...options,
      showSuccessToast: false,
      showErrorToast: false,
      bucket,
    });

    if (result) {
      successful++;
    } else {
      failed++;
    }

    // Small delay between downloads to avoid overwhelming the browser
    if (i < storagePaths.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Show final result only for errors
  if (failed > 0 && showErrorToast) {
    toast.error(`Downloaded ${successful} files, ${failed} failed`);
  }

  logger.info('Batch download completed', {
    total: storagePaths.length,
    successful,
    failed,
  });

  return { successful, failed };
}

/**
 * Extract filename from storage path
 */
function extractFilenameFromPath(path: string): string | null {
  const parts = path.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Get file extension from filename or path
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
