import { useState, useCallback } from 'react';
import { DownloadManager } from '@/lib/media/downloadManager';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Hook for downloading files with loading state and error handling
 * 
 * @returns Download function and loading state
 * 
 * @example
 * ```typescript
 * const { download, isDownloading } = useDownload();
 * 
 * await download('https://example.com/file.jpg', 'image.jpg');
 * ```
 */
export function useDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const download = useCallback(async (url: string, filename: string) => {
    setIsDownloading(true);
    setProgress(0);
    
    const toastId = toast.loading('Preparing download...');
    
    try {
      await DownloadManager.download(url, filename, (progress) => {
        setProgress(progress);
        toast.loading(`Downloading... ${progress}%`, { id: toastId });
      });
      
      toast.success('Download complete', { id: toastId });
    } catch (error) {
      const appError = handleError(error, { url, filename });
      logger.error('Download failed', error as Error, { url, filename });
      toast.error(appError.message, { id: toastId });
      throw appError;
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  }, []);

  const batchDownload = useCallback(
    async (items: Array<{ url: string; filename: string }>) => {
      setIsDownloading(true);
      const toastId = toast.loading(`Downloading ${items.length} files...`);
      
      try {
        await DownloadManager.batchDownload(items);
        toast.success(`Downloaded ${items.length} files`, { id: toastId });
      } catch (error) {
        const appError = handleError(error);
        logger.error('Batch download failed', error as Error, { count: items.length });
        toast.error(appError.message, { id: toastId });
        throw appError;
      } finally {
        setIsDownloading(false);
      }
    },
    []
  );

  return { download, batchDownload, isDownloading, progress };
}
