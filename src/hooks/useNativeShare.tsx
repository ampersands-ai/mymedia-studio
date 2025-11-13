import { Share } from '@capacitor/share';
import { isNativePlatform, triggerHaptic } from '@/utils/capacitor-utils';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'useNativeShare' });

export interface UseNativeShareResult {
  shareUrl: (url: string, title?: string, text?: string) => Promise<void>;
  shareFile: (url: string, title?: string) => Promise<void>;
  canShare: boolean;
  isNative: boolean;
}

/**
 * Hook for native sharing on mobile devices
 * Falls back to Web Share API or clipboard on browsers
 */
export const useNativeShare = (): UseNativeShareResult => {
  const isNative = isNativePlatform();
  const canShare = isNative || (typeof navigator !== 'undefined' && !!navigator.share);

  /**
   * Share a URL with optional title and text
   */
  const shareUrl = async (url: string, title?: string, text?: string): Promise<void> => {
    if (isNative) {
      try {
        await Share.share({
          title: title || 'Check this out!',
          text: text || '',
          url,
          dialogTitle: 'Share via',
        });
        await triggerHaptic('light');
      } catch (error) {
        if ((error as Error).message !== 'Share canceled') {
          componentLogger.error('Native share URL failed', error, {
            operation: 'shareUrl',
            url,
            title
          });
          toast.error('Failed to share');
        }
      }
      return;
    }

    // Web fallback: try Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Check this out!',
          text: text || '',
          url,
        });
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          componentLogger.warn('Web share failed, falling back to clipboard', {
            operation: 'shareUrl',
            url,
            errorName: error.name
          });
          // Fallback to clipboard
          await copyToClipboard(url);
        }
      }
    } else {
      // No share API: copy to clipboard
      await copyToClipboard(url);
    }
  };

  /**
   * Share a file (image, video, audio)
   */
  const shareFile = async (url: string, title?: string): Promise<void> => {
    if (isNative) {
      try {
        await Share.share({
          title: title || 'Check out my creation!',
          url,
          dialogTitle: 'Share via',
        });
        await triggerHaptic('light');
      } catch (error) {
        if ((error as Error).message !== 'Share canceled') {
          componentLogger.error('Native share file failed', error, {
            operation: 'shareFile',
            url,
            title
          });
          toast.error('Failed to share file');
        }
      }
      return;
    }

    // Web fallback: try to fetch and share as blob
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'creation.png', { type: blob.type });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title || 'Check out my creation!',
          });
          return;
        }
      } catch (error) {
        componentLogger.warn('Web file share failed, falling back to clipboard', {
          operation: 'shareFile',
          url,
          error
        });
      }
    }

    // Final fallback: copy URL to clipboard
    await copyToClipboard(url);
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      componentLogger.error('Clipboard copy failed', error, {
        operation: 'copyToClipboard',
        textLength: text.length
      });
      toast.error('Failed to copy link');
    }
  };

  return {
    shareUrl,
    shareFile,
    canShare,
    isNative,
  };
};
