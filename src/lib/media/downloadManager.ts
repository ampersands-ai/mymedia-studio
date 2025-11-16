import { logger } from '@/lib/logger';

/**
 * Centralized download manager for media files
 * Provides unified download logic with progress tracking and error handling
 */
export class DownloadManager {
  /**
   * Downloads a file from a URL with progress tracking
   * 
   * @param url - URL to download from
   * @param filename - Desired filename for download
   * @param onProgress - Optional callback for progress updates (0-100)
   * @returns Promise that resolves when download completes
   * 
   * @throws {Error} If download fails
   * 
   * @example
   * ```typescript
   * await DownloadManager.download(
   *   'https://example.com/file.jpg',
   *   'image.jpg',
   *   (progress) => console.log(`${progress}% complete`)
   * );
   * ```
   */
  static async download(
    url: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      logger.info('Download started', { filename, url } as any);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup object URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);

      logger.info('Download completed', { filename } as any);
      onProgress?.(100);
    } catch (error) {
      logger.error('Download failed', error as Error, { filename, url } as any);
      throw error;
    }
  }

  /**
   * Download multiple files with rate limiting
   * 
   * @param items - Array of items to download
   * @param delayMs - Delay between downloads in milliseconds
   */
  static async batchDownload(
    items: Array<{ url: string; filename: string }>,
    delayMs: number = 100
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await this.download(item.url, item.filename);
      
      // Add delay between downloads except for last item
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
}
