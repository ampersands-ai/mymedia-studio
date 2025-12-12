import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNativePlatform, isIOS, triggerHaptic } from '@/utils/capacitor-utils';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'useNativeDownload' });

export interface UseNativeDownloadResult {
  downloadFile: (url: string, filename?: string) => Promise<void>;
  isNative: boolean;
}

/**
 * Hook for native file downloads on mobile devices
 * Falls back to browser download on web
 */
export const useNativeDownload = (): UseNativeDownloadResult => {
  const isNative = isNativePlatform();

  /**
   * Download file to device
   */
  const downloadFile = async (url: string, filename?: string): Promise<void> => {
    // Extract extension from URL pathname (handles query parameters)
    let extension = '';
    if (!filename) {
      try {
        const urlObj = new URL(url);
        extension = urlObj.pathname.split('.').pop() || '';
      } catch {
        extension = url.split('.').pop() || '';
      }
    }
    const name = filename || `download_${Date.now()}.${extension}`;

    if (!isNative) {
      // Web fallback: use anchor download
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        componentLogger.error('Web download failed', error instanceof Error ? error : new Error(String(error)), {
          operation: 'downloadFile',
          url,
          filename: name
        });
        toast.error('Failed to download file');
      }
      return;
    }

    // Native download
    try {
      // Fetch the file
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Determine directory based on file type
      // On iOS, save to Documents (can't directly save to Photos without plugin)
      // On Android, save to Downloads
      const directory = isIOS() ? Directory.Documents : Directory.Documents;

      // Write file
      await Filesystem.writeFile({
        path: name,
        data: base64Data,
        directory,
      });

      await triggerHaptic('medium');
      
      componentLogger.debug('File saved to device', {
        operation: 'downloadFile',
        filename: name,
        directory,
        isIOS: isIOS()
      });
    } catch (error) {
      componentLogger.error('Native download failed', error instanceof Error ? error : new Error(String(error)), {
        operation: 'downloadFile',
        url,
        filename: name
      });
      toast.error('Failed to download file', {
        description: 'Please check app permissions',
      });
    }
  };

  return {
    downloadFile,
    isNative,
  };
};
