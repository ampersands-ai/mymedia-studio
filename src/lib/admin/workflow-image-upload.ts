import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl } from "@/lib/storage-utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Upload a workflow image file to Supabase storage
 * @param file - The image file to upload
 * @param type - Image type ('before' or 'after')
 * @returns Promise that resolves with the storage path or null if failed
 */
export async function uploadWorkflowImage(
  file: File,
  type: 'before' | 'after'
): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    toast.error('Please upload an image file');
    return null;
  }

  try {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `templates/${type}/${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error('Workflow image upload failed', uploadError, {
        utility: 'workflow-image-upload',
        imageType: type,
        fileName: file.name,
        fileSize: file.size,
        filePath,
        operation: 'uploadWorkflowImage'
      });
      toast.error(`Failed to upload ${type} image`);
      return null;
    }

    // Return the storage path instead of URL (for signed URL generation later)
    return filePath;
  } catch (error) {
    logger.error('Workflow image upload exception', error as Error, {
      utility: 'workflow-image-upload',
      imageType: type,
      fileName: file.name,
      operation: 'uploadWorkflowImage'
    });
    toast.error(`Failed to upload ${type} image`);
    return null;
  }
}

/**
 * Generate a signed URL for an existing image in storage
 * @param storagePath - The storage path (without bucket prefix)
 * @returns Promise that resolves with the signed URL or null if failed
 */
export async function getSignedImageUrl(
  storagePath: string
): Promise<string | null> {
  try {
    const signedUrl = await createSignedUrl('generated-content', storagePath);
    return signedUrl;
  } catch (error) {
    logger.error('Workflow image signed URL generation failed', error as Error, {
      utility: 'workflow-image-upload',
      storagePath: storagePath.substring(0, 50),
      operation: 'getSignedImageUrl'
    });
    return null;
  }
}

/**
 * Extract storage path from a full URL or return path if already a storage path
 * @param url - Full URL or storage path
 * @returns Storage path or null if extraction failed
 */
export function extractStoragePathFromUrl(url: string): string | null {
  if (!url) return null;
  
  // If it's already a storage path (doesn't start with http), return as-is
  if (!url.startsWith('http')) {
    return url;
  }
  
  // Extract path from full URL (format: .../generated-content/path/to/file.ext)
  const match = url.match(/generated-content\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Create a preview URL from a file using FileReader
 * @param file - The file to create preview for
 * @returns Promise that resolves with the data URL
 */
export function createFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
