import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for secure access to storage files
 * @param bucket - Storage bucket name
 * @param filePath - File path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL with expiration
 */
export async function createSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 14400 // 4 hours for better video streaming
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
}

/**
 * Generate multiple signed URLs for a list of file paths
 * @param bucket - Storage bucket name
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Array of signed URLs
 */
export async function createSignedUrls(
  bucket: string,
  filePaths: string[],
  expiresIn: number = 14400 // 4 hours for better video streaming
): Promise<string[]> {
  const signedUrls = await Promise.all(
    filePaths.map(path => createSignedUrl(bucket, path, expiresIn))
  );

  return signedUrls.filter((url): url is string => url !== null);
}
