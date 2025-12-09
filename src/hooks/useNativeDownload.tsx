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
   * Determine MIME type from URL or filename
   * Properly handles URLs with query parameters
   */
  const getMimeType = (url: string): string => {
    // Extract pathname from URL (handles query parameters)
    let pathname: string;
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    } catch {
      // If URL parsing fails, use the string directly (might be a relative path)
      pathname = url;
    }

    // Extract extension from pathname
    const extension = pathname.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      pdf: 'application/pdf',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  };

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
      toast.info('Downloading...');
      
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
      const mimeType = getMimeType(url);
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      
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
      
      if (isIOS()) {
        toast.success(`Saved to Files app!`, {
          description: 'Open Files app to view your download',
        });
      } else {
        toast.success(`Saved to ${isImage ? 'Gallery' : isVideo ? 'Videos' : 'Downloads'}!`);
      }
      
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
