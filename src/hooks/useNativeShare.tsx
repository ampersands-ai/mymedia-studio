import { Share } from '@capacitor/share';
import { isNativePlatform, triggerHaptic } from '@/utils/capacitor-utils';
import { toast } from 'sonner';

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
      } catch (error: any) {
        if (error.message !== 'Share canceled') {
          console.error('Error sharing:', error);
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
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
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
      } catch (error: any) {
        if (error.message !== 'Share canceled') {
          console.error('Error sharing file:', error);
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
        console.error('Error sharing file:', error);
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
      console.error('Failed to copy:', error);
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
