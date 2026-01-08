import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { IMAGE_UPLOAD_CONFIG } from "@/constants/custom-creation";
import { getImageFieldInfo } from "@/lib/custom-creation-utils";
import type { ModelConfiguration } from "@/types/schema";
import { logger } from "@/lib/logger";

// ModelSchema type from custom-creation-utils
type ModelSchema = {
  input_schema?: {
    required?: string[];
    imageInputField?: string;
    properties?: Record<string, {
      type?: string;
      maxItems?: number;
    }>;
    conditionalFields?: Record<string, {
      dependsOn?: string;
      value?: unknown;
    }>;
  };
  max_images?: number;
  provider: string;
  content_type: string;
};

// Type stub for backward compatibility - models now loaded from registry
type AIModel = ModelConfiguration;

const STORAGE_KEY_PREFIX = 'uploadedImages_';

/**
 * Convert File to storable format (with data URL)
 */
const fileToStorable = async (file: File) => ({
  name: file.name,
  type: file.type,
  size: file.size,
  lastModified: file.lastModified,
  dataUrl: await fileToDataUrl(file),
});

/**
 * Convert File to base64 data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Reconstruct File from stored data
 */
const storableToFile = (stored: { dataUrl: string; type: string; name: string; lastModified?: number }): File => {
  const arr = stored.dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], stored.name, { 
    type: stored.type,
    lastModified: stored.lastModified,
  });
};

/**
 * Get storage key based on current model
 */
const getStorageKey = (modelId: string | null) => {
  return `${STORAGE_KEY_PREFIX}${modelId || 'default'}`;
};

/**
 * Image upload management with validation and native camera support
 */
export const useImageUpload = (currentModel: AIModel | null) => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pickImage, pickMultipleImages, isLoading: cameraLoading, isNative } = useNativeCamera();
  
  const imageFieldInfo = currentModel ? getImageFieldInfo({
    provider: currentModel.provider,
    content_type: currentModel.content_type,
    input_schema: currentModel.input_schema as ModelSchema['input_schema'] | undefined,
    max_images: currentModel.max_images ?? undefined,
  } as ModelSchema) : { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };

  // Load persisted images from sessionStorage on mount or model change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);
    const stored = sessionStorage.getItem(storageKey);
    
    // Reset file input to allow re-selecting same file after model change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const files = parsed.map(storableToFile);
        setUploadedImages(files);
        logger.info(`Restored ${files.length} images from sessionStorage`);
      } catch (err) {
        logger.error('Failed to restore images', err instanceof Error ? err : new Error(String(err)));
        sessionStorage.removeItem(storageKey);
      }
    } else {
      // Clear images when switching models
      setUploadedImages([]);
    }
  }, [currentModel?.record_id]);

  // Persist images to sessionStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);

    if (uploadedImages.length > 0) {
      const persistImages = async () => {
        try {
          const storable = await Promise.all(uploadedImages.map(fileToStorable));
          sessionStorage.setItem(storageKey, JSON.stringify(storable));
          logger.info(`Persisted ${storable.length} images to sessionStorage`);
        } catch (err) {
          logger.error('Failed to persist images', err as Error);
        }
      };

      persistImages();
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [uploadedImages, currentModel?.record_id]);

  /**
   * Handle file upload from input
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Reset input value immediately so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
    
    // Guard: if model is not loaded yet, show error
    if (!currentModel) {
      toast.error("Please wait for model to load");
      return;
    }
    
    const modelMaxImages = currentModel.max_images ?? 0;
    
    // If max_images is 0, check if this is an image-input model type
    if (modelMaxImages === 0) {
      const isImageInputModel = ['image_editing', 'image_to_video', 'image_to_image'].includes(currentModel.content_type);
      if (!isImageInputModel) {
        toast.error("This model does not accept image uploads");
        return;
      }
      // For image-input models with max_images=0, use fallback of 1
      logger.warn('max_images is 0 for image-input model, using fallback of 1');
    }
    
    // Determine effective max images
    let effectiveMax = modelMaxImages || 1;
    
    // For single image fields, max is 1
    if (!imageFieldInfo.isArray && imageFieldInfo.fieldName) {
      effectiveMax = 1;
    }
    
    // Check if adding files would exceed limit
    if (uploadedImages.length + files.length > effectiveMax) {
      if (effectiveMax === 1) {
        // Single image: replace existing
        setUploadedImages([]); // Clear existing
      } else {
        toast.error(`Maximum ${effectiveMax} image(s) allowed for this model`);
        return;
      }
    }
    
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (file.size > IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large (max 10MB)`);
        continue;
      }
      
      if (!(IMAGE_UPLOAD_CONFIG.VALID_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`"${file.name}" has invalid type. Only JPEG, PNG, and WebP allowed.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      // For single image, replace; for array, append
      if (effectiveMax === 1) {
        setUploadedImages(validFiles.slice(0, 1));
      } else {
        setUploadedImages([...uploadedImages, ...validFiles]);
      }
    }
  }, [uploadedImages, currentModel, imageFieldInfo]);

  /**
   * Remove image by index
   */
  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Upload images to Supabase storage and return signed URLs
   */
  const uploadImagesToStorage = useCallback(async (userId: string): Promise<string[]> => {
    if (uploadedImages.length === 0) return [];
    
    const timestamp = Date.now();
    const imageUrls: string[] = [];

    for (let i = 0; i < uploadedImages.length; i++) {
      const file = uploadedImages[i];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/uploads/${timestamp}/${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${file.name}`);
      }

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, IMAGE_UPLOAD_CONFIG.SIGNED_URL_EXPIRY);

      if (signedError || !signedData) {
        throw new Error(`Failed to create secure URL for: ${file.name}`);
      }

      imageUrls.push(signedData.signedUrl);
    }

    return imageUrls;
  }, [uploadedImages]);

  /**
   * Handle native camera image pick
   */
  const handleNativeCameraPick = useCallback(async (source: 'camera' | 'gallery') => {
    const effectiveMax = imageFieldInfo.maxImages || 1;
    
    if (effectiveMax === 1 || source === 'camera') {
      // Single image
      const file = await pickImage(source);
      if (file) {
        setUploadedImages([file]);
      }
    } else {
      // Multiple images (gallery only)
      const files = await pickMultipleImages(effectiveMax - uploadedImages.length);
      if (files.length > 0) {
        setUploadedImages([...uploadedImages, ...files]);
      }
    }
  }, [pickImage, pickMultipleImages, uploadedImages, imageFieldInfo]);

  return {
    uploadedImages,
    setUploadedImages,
    handleFileUpload,
    removeImage,
    uploadImagesToStorage,
    handleNativeCameraPick,
    fileInputRef,
    cameraLoading,
    isNative,
    pickImage,
    pickMultipleImages,
  };
};
