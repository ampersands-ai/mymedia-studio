import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativePlatform, triggerHaptic } from '@/utils/capacitor-utils';
import { toast } from 'sonner';

export interface UseNativeCameraResult {
  pickImage: (source?: 'camera' | 'gallery') => Promise<File | null>;
  pickMultipleImages: (maxImages?: number) => Promise<File[]>;
  isLoading: boolean;
  isNative: boolean;
}

/**
 * Hook for native camera/gallery access on mobile devices
 * Falls back to web file input on browsers
 */
export const useNativeCamera = (): UseNativeCameraResult => {
  const [isLoading, setIsLoading] = useState(false);
  const isNative = isNativePlatform();

  /**
   * Convert base64 image to File object
   */
  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const response = await fetch(base64);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  /**
   * Pick a single image from camera or gallery
   */
  const pickImage = async (source: 'camera' | 'gallery' = 'gallery'): Promise<File | null> => {
    if (!isNative) {
      // Web fallback: use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (source === 'camera') {
          input.capture = 'environment';
        }
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          resolve(file || null);
        };
        
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    setIsLoading(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (!photo.base64String) {
        throw new Error('No image data received');
      }

      // Convert base64 to File
      const base64Data = `data:${photo.format === 'jpeg' ? 'image/jpeg' : 'image/png'};base64,${photo.base64String}`;
      const file = await base64ToFile(
        base64Data, 
        `photo_${Date.now()}.${photo.format === 'jpeg' ? 'jpg' : 'png'}`
      );

      await triggerHaptic('light');
      return file;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Error picking image:', error);
        toast.error('Failed to pick image');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pick multiple images from gallery
   */
  const pickMultipleImages = async (maxImages = 10): Promise<File[]> => {
    if (!isNative) {
      // Web fallback: use file input with multiple
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.onchange = async (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          resolve(files.slice(0, maxImages));
        };
        
        input.oncancel = () => resolve([]);
        input.click();
      });
    }

    setIsLoading(true);
    const files: File[] = [];
    
    try {
      // Note: Capacitor Camera doesn't support multiple selection directly
      // We'll pick one at a time until user cancels or reaches max
      toast.info(`Select up to ${maxImages} images (tap cancel when done)`);
      
      for (let i = 0; i < maxImages; i++) {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Photos,
        });

        if (!photo.base64String) break;

        const base64Data = `data:${photo.format === 'jpeg' ? 'image/jpeg' : 'image/png'};base64,${photo.base64String}`;
        const file = await base64ToFile(
          base64Data, 
          `photo_${Date.now()}_${i}.${photo.format === 'jpeg' ? 'jpg' : 'png'}`
        );
        
        files.push(file);
        await triggerHaptic('light');
        
        // Ask if user wants to add more
        if (i < maxImages - 1) {
          const addMore = window.confirm(`Added ${i + 1} image(s). Add another?`);
          if (!addMore) break;
        }
      }
      
      return files;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Error picking images:', error);
        toast.error('Failed to pick images');
      }
      return files; // Return whatever was selected so far
    } finally {
      setIsLoading(false);
    }
  };

  return {
    pickImage,
    pickMultipleImages,
    isLoading,
    isNative,
  };
};
